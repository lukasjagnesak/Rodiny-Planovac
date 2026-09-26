/**
 * Zapisovač PDF s vloženými písmy.
 *
 * Dva důvody, proč si ho skládáme sami. Čeština: standardní fonty v PDF
 * neznají č, ř, ě ani ů, takže dokument bez vloženého písma se rozsype.
 * A vzhled: dokument si lidé přeposílají a nosí k advokátovi, takže má
 * vypadat jako Klidoo, ne jako výpis ze systému.
 *
 * Proto se vkládají stejná písma, jaká má web — Baloo 2 na nadpisy,
 * Inter na text — a sází se to jako web: krémový papír, bílé karty se
 * zaoblením, nadtitulek v barvě značky. Licence jsou v `public/fonty/`.
 *
 * Co to neumí: obrázky, dělení slov, obtékání. Až bude potřeba něco
 * z toho, je čas sáhnout po knihovně.
 */

import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { proPdf } from "./barvy";

/* ── Čtení TrueType ────────────────────────────────────────────── */

interface Pismo {
  data: Buffer;
  jednotek: number;
  /** Unicode → index glyfu. */
  glyfy: Map<number, number>;
  /** Index glyfu → šířka v jednotkách písma. */
  sirky: Map<number, number>;
  bbox: [number, number, number, number];
  ascent: number;
  descent: number;
  capHeight: number;
}

function tabulky(data: Buffer): Map<string, { offset: number; delka: number }> {
  const pocet = data.readUInt16BE(4);
  const mapa = new Map<string, { offset: number; delka: number }>();
  for (let i = 0; i < pocet; i += 1) {
    const zaklad = 12 + i * 16;
    mapa.set(data.toString("latin1", zaklad, zaklad + 4), {
      offset: data.readUInt32BE(zaklad + 8),
      delka: data.readUInt32BE(zaklad + 12),
    });
  }
  return mapa;
}

/**
 * Znaková mapa, formát 4.
 *
 * Bereme podtabulku (3,1), tedy Windows Unicode BMP — v ní je latinka
 * i s háčky a čárkami. Jiné formáty neřešíme; písmo si vybíráme sami,
 * takže víme, co v něm je.
 */
function ctiCmap(data: Buffer, offset: number): Map<number, number> {
  const pocet = data.readUInt16BE(offset + 2);
  let podtabulka = -1;
  for (let i = 0; i < pocet; i += 1) {
    const zaklad = offset + 4 + i * 8;
    const platforma = data.readUInt16BE(zaklad);
    const kodovani = data.readUInt16BE(zaklad + 2);
    if (platforma === 3 && (kodovani === 1 || kodovani === 10)) {
      podtabulka = offset + data.readUInt32BE(zaklad + 4);
      break;
    }
  }
  if (podtabulka < 0) throw new Error("Písmo nemá znakovou mapu Windows Unicode.");

  const format = data.readUInt16BE(podtabulka);
  if (format !== 4) throw new Error(`Nepodporovaný formát znakové mapy: ${format}`);

  const segmentu = data.readUInt16BE(podtabulka + 6) / 2;
  const konce = podtabulka + 14;
  const zacatky = konce + segmentu * 2 + 2;
  const delty = zacatky + segmentu * 2;
  const rozsahy = delty + segmentu * 2;

  const mapa = new Map<number, number>();
  for (let s = 0; s < segmentu; s += 1) {
    const konec = data.readUInt16BE(konce + s * 2);
    const zacatek = data.readUInt16BE(zacatky + s * 2);
    const delta = data.readInt16BE(delty + s * 2);
    const rozsah = data.readUInt16BE(rozsahy + s * 2);
    if (zacatek > konec) continue;

    for (let znak = zacatek; znak <= konec && znak !== 0xffff; znak += 1) {
      let glyf: number;
      if (rozsah === 0) {
        glyf = (znak + delta) & 0xffff;
      } else {
        const kam = rozsahy + s * 2 + rozsah + (znak - zacatek) * 2;
        if (kam + 1 >= data.length) continue;
        const g = data.readUInt16BE(kam);
        glyf = g === 0 ? 0 : (g + delta) & 0xffff;
      }
      if (glyf !== 0) mapa.set(znak, glyf);
    }
  }
  return mapa;
}

function nactiPismo(soubor: string): Pismo {
  const data = readFileSync(soubor);
  const t = tabulky(data);
  const head = t.get("head");
  const hhea = t.get("hhea");
  const hmtx = t.get("hmtx");
  const maxp = t.get("maxp");
  const cmap = t.get("cmap");
  if (!head || !hhea || !hmtx || !maxp || !cmap) throw new Error("Písmo nemá povinné tabulky.");

  const jednotek = data.readUInt16BE(head.offset + 18);
  const pocetMetrik = data.readUInt16BE(hhea.offset + 34);
  const pocetGlyfu = data.readUInt16BE(maxp.offset + 4);

  const sirky = new Map<number, number>();
  let posledni = 0;
  for (let g = 0; g < pocetGlyfu; g += 1) {
    if (g < pocetMetrik) posledni = data.readUInt16BE(hmtx.offset + g * 4);
    sirky.set(g, posledni);
  }

  const os2 = t.get("OS/2");
  return {
    data,
    jednotek,
    glyfy: ctiCmap(data, cmap.offset),
    sirky,
    bbox: [
      data.readInt16BE(head.offset + 36),
      data.readInt16BE(head.offset + 38),
      data.readInt16BE(head.offset + 40),
      data.readInt16BE(head.offset + 42),
    ],
    ascent: data.readInt16BE(hhea.offset + 4),
    descent: data.readInt16BE(hhea.offset + 6),
    capHeight: os2 && os2.delka >= 90 ? data.readInt16BE(os2.offset + 88) : 700,
  };
}

/**
 * Řezy odpovídají webu: nadpisy Baloo 2, zbytek Inter.
 *
 * `tucne` je skutečný druhý řez, ne obtažení. Obtažení vypadá na
 * obrazovce ucházejícím, ale vytištěné je z něj mour — a tenhle
 * dokument se tiskne.
 */
export type Rez = "telo" | "tucne" | "nadpis";

const SOUBORY: Record<Rez, string> = {
  telo: "Inter-Regular.ttf",
  tucne: "Inter-SemiBold.ttf",
  nadpis: "Baloo2-SemiBold.ttf",
};

const ulozena = new Map<Rez, Pismo>();

function pismo(rez: Rez = "telo"): Pismo {
  let nactene = ulozena.get(rez);
  if (!nactene) {
    nactene = nactiPismo(join(process.cwd(), "public", "fonty", SOUBORY[rez]));
    ulozena.set(rez, nactene);
  }
  return nactene;
}

/* ── Měření a kódování textu ───────────────────────────────────── */

/** Neznámý znak nahradí otazníkem, ať dokument nespadne kvůli emoji. */
function glyf(p: Pismo, znak: number): number {
  return p.glyfy.get(znak) ?? p.glyfy.get(0x003f) ?? 0;
}

export function sirkaTextu(text: string, velikost: number, rez: Rez = "telo"): number {
  const p = pismo(rez);
  let soucet = 0;
  for (const znak of text) {
    soucet += p.sirky.get(glyf(p, znak.codePointAt(0)!)) ?? 0;
  }
  return (soucet / p.jednotek) * velikost;
}

function hexGlyfy(text: string, pouzite: Set<number>, rez: Rez = "telo"): string {
  const p = pismo(rez);
  let out = "";
  for (const znak of text) {
    const g = glyf(p, znak.codePointAt(0)!);
    pouzite.add(g);
    out += g.toString(16).padStart(4, "0");
  }
  return out;
}

/** Zalomení na šířku sloupce. Dělení slov neumíme, dlouhé slovo přeteče. */
export function zalom(
  text: string,
  velikost: number,
  sirka: number,
  rez: Rez = "telo",
): string[] {
  const radky: string[] = [];
  for (const odstavec of text.split("\n")) {
    let radek = "";
    for (const slovo of odstavec.split(/\s+/).filter(Boolean)) {
      const zkouska = radek ? `${radek} ${slovo}` : slovo;
      if (radek && sirkaTextu(zkouska, velikost, rez) > sirka) {
        radky.push(radek);
        radek = slovo;
      } else {
        radek = zkouska;
      }
    }
    radky.push(radek);
  }
  return radky;
}

/* ── Prvky dokumentu ───────────────────────────────────────────── */

export type Prvek =
  /** Malý nadpis nad hlavním — verzálky v barvě značky, jako na webu. */
  | { typ: "nadtitulek"; text: string }
  | { typ: "nadpis"; text: string }
  | { typ: "podnadpis"; text: string }
  | { typ: "odstavec"; text: string }
  | { typ: "radek"; vlevo: string; vpravo: string; silny?: boolean }
  | { typ: "cislo"; popis: string; hodnota: string }
  | { typ: "cara" }
  | { typ: "mezera"; vyska?: number }
  /** Bílá karta se zaoblením — nosný prvek webu. */
  | { typ: "karta"; prvky: Prvek[] };

const STRANA = { sirka: 595.28, vyska: 841.89 };
const OKRAJ = { vlevo: 52, vpravo: 52, hlavicka: 62, paticka: 48 };
const SLOUPEC = STRANA.sirka - OKRAJ.vlevo - OKRAJ.vpravo;

/** Vnitřní okraj karty a poloměr rohů — stejné hodnoty jako `--radius-card`. */
const KARTA = { okraj: 18, roh: 16 };

const INK = proPdf("ink");
const TLUMENA = proPdf("inkMuted");
const SLABA = proPdf("inkSubtle");
const LINKA = proPdf("line");
const ZNACKA_BARVA = proPdf("brand");
const PAPIR = proPdf("canvas");
const KARTA_BARVA = "1 1 1";
const RODIC_A = proPdf("parentA");
const RODIC_B = proPdf("parentB");

/** Velikosti písma. Poměry jsou opsané z webu, ne vymyšlené. */
const VELIKOST = {
  nadtitulek: 9,
  nadpis: 24,
  podnadpis: 15,
  odstavec: 10.5,
  radek: 10.5,
  popisCisla: 9.5,
  cislo: 30,
  paticka: 8.5,
};

/* ── Znak ──────────────────────────────────────────────────────── */

/** Bézierova aproximace kruhu. Čtyři oblouky stačí, oko rozdíl nepozná. */
const K = 0.5523;

function kruh(x: number, y: number, r: number): string {
  const k = r * K;
  return [
    `${(x - r).toFixed(2)} ${y.toFixed(2)} m`,
    `${(x - r).toFixed(2)} ${(y + k).toFixed(2)} ${(x - k).toFixed(2)} ${(y + r).toFixed(2)} ${x.toFixed(2)} ${(y + r).toFixed(2)} c`,
    `${(x + k).toFixed(2)} ${(y + r).toFixed(2)} ${(x + r).toFixed(2)} ${(y + k).toFixed(2)} ${(x + r).toFixed(2)} ${y.toFixed(2)} c`,
    `${(x + r).toFixed(2)} ${(y - k).toFixed(2)} ${(x + k).toFixed(2)} ${(y - r).toFixed(2)} ${x.toFixed(2)} ${(y - r).toFixed(2)} c`,
    `${(x - k).toFixed(2)} ${(y - r).toFixed(2)} ${(x - r).toFixed(2)} ${(y - k).toFixed(2)} ${(x - r).toFixed(2)} ${y.toFixed(2)} c`,
    "f",
  ].join("\n");
}

/** Obdélník se zaoblenými rohy — karty na webu mají 16 px. */
function zaobleny(x: number, y: number, sirka: number, vyska: number, r: number): string {
  const k = r * K;
  const x2 = x + sirka;
  const y2 = y + vyska;
  return [
    `${(x + r).toFixed(2)} ${y.toFixed(2)} m`,
    `${(x2 - r).toFixed(2)} ${y.toFixed(2)} l`,
    `${(x2 - r + k).toFixed(2)} ${y.toFixed(2)} ${x2.toFixed(2)} ${(y + r - k).toFixed(2)} ${x2.toFixed(2)} ${(y + r).toFixed(2)} c`,
    `${x2.toFixed(2)} ${(y2 - r).toFixed(2)} l`,
    `${x2.toFixed(2)} ${(y2 - r + k).toFixed(2)} ${(x2 - r + k).toFixed(2)} ${y2.toFixed(2)} ${(x2 - r).toFixed(2)} ${y2.toFixed(2)} c`,
    `${(x + r).toFixed(2)} ${y2.toFixed(2)} l`,
    `${(x + r - k).toFixed(2)} ${y2.toFixed(2)} ${x.toFixed(2)} ${(y2 - r + k).toFixed(2)} ${x.toFixed(2)} ${(y2 - r).toFixed(2)} c`,
    `${x.toFixed(2)} ${(y + r).toFixed(2)} l`,
    `${x.toFixed(2)} ${(y + r - k).toFixed(2)} ${(x + r - k).toFixed(2)} ${y.toFixed(2)} ${(x + r).toFixed(2)} ${y.toFixed(2)} c`,
  ].join("\n");
}

/**
 * Dvě kolečka, která se překrývají — dva domovy a dítě uprostřed.
 *
 * Geometrie je převzatá z `components/ui/logo.tsx`: plátno 120 × 80,
 * poloměr 34, středy na 46 a 74. Překryv vzniká prolnutím barev
 * (`/BM /Multiply`), ne třetím odstínem — stejně jako na webu.
 */
function znak(x: number, stred: number, vyska: number): string {
  const sirka = (vyska * 120) / 80;
  const r = (vyska * 34) / 80;
  return [
    "q",
    `${RODIC_A} rg`,
    kruh(x + (sirka * 46) / 120, stred, r),
    "/GSprolnuti gs",
    `${RODIC_B} rg`,
    kruh(x + (sirka * 74) / 120, stred, r),
    "Q",
  ].join("\n");
}

function sirkaZnaku(vyska: number): number {
  return (vyska * 120) / 80;
}

/* ── Sazba ─────────────────────────────────────────────────────── */

function pdfRetezec(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export interface PdfMeta {
  titulek: string;
  autor?: string;
  paticka?: string;
}

interface Kontext {
  /** `null` znamená měření nanečisto — kreslit se nic nemá. */
  out: string[] | null;
  pouzite: Record<Rez, Set<number>>;
}

/**
 * Jedna textová řádka.
 *
 * `rozpal` je mezera mezi písmeny; PDF na ni má vlastní operátor, takže
 * se musí připočíst i k šířce, jinak by se zarovnání doprava rozjelo.
 */
function textOps(
  ctx: Kontext,
  text: string,
  velikost: number,
  x: number,
  y: number,
  barva: string,
  rez: Rez,
  rozpal = 0,
): void {
  if (!ctx.out) {
    hexGlyfy(text, ctx.pouzite[rez], rez);
    return;
  }
  ctx.out.push(
    "BT",
    `${barva} rg`,
    `/F${POradi[rez]} ${velikost} Tf`,
    rozpal ? `${rozpal} Tc` : "0 Tc",
    `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`,
    `<${hexGlyfy(text, ctx.pouzite[rez], rez)}> Tj`,
    "ET",
  );
}

const POradi: Record<Rez, number> = { telo: 1, tucne: 2, nadpis: 3 };

function sirkaSRozpalem(text: string, velikost: number, rez: Rez, rozpal: number): number {
  return sirkaTextu(text, velikost, rez) + rozpal * Math.max(0, [...text].length - 1);
}

/**
 * Vykreslí prvek a vrátí novou svislou pozici.
 *
 * Tatáž funkce slouží i k měření: když `ctx.out` chybí, jen se počítá.
 * Díky tomu ví karta dopředu, jak bude vysoká, a nakreslí se pod obsah.
 */
function polozka(
  prvek: Prvek,
  x: number,
  y: number,
  sirka: number,
  ctx: Kontext,
): number {
  switch (prvek.typ) {
    case "nadtitulek": {
      const v = VELIKOST.nadtitulek;
      y -= v * 1.2;
      textOps(ctx, prvek.text.toUpperCase(), v, x, y, ZNACKA_BARVA, "tucne", 0.9);
      return y - 10;
    }
    case "nadpis": {
      const v = VELIKOST.nadpis;
      for (const radek of zalom(prvek.text, v, sirka, "nadpis")) {
        y -= v * 1.14;
        textOps(ctx, radek, v, x, y, INK, "nadpis");
      }
      return y - 12;
    }
    case "podnadpis": {
      const v = VELIKOST.podnadpis;
      y -= v * 1.6;
      textOps(ctx, prvek.text, v, x, y, INK, "nadpis");
      return y - 5;
    }
    case "odstavec": {
      const v = VELIKOST.odstavec;
      for (const radek of zalom(prvek.text, v, sirka)) {
        y -= v * 1.55;
        textOps(ctx, radek, v, x, y, TLUMENA, "telo");
      }
      return y - 5;
    }
    case "radek": {
      const v = VELIKOST.radek;
      y -= v * 1.72;
      textOps(ctx, prvek.vlevo, v, x, y, TLUMENA, "telo");
      const rez: Rez = prvek.silny ? "tucne" : "telo";
      textOps(
        ctx,
        prvek.vpravo,
        v,
        x + sirka - sirkaTextu(prvek.vpravo, v, rez),
        y,
        INK,
        rez,
      );
      return y;
    }
    case "cislo": {
      y -= VELIKOST.popisCisla * 1.5;
      textOps(ctx, prvek.popis, VELIKOST.popisCisla, x, y, TLUMENA, "telo");
      y -= VELIKOST.cislo * 1.1;
      textOps(ctx, prvek.hodnota, VELIKOST.cislo, x, y, ZNACKA_BARVA, "nadpis");
      return y - 8;
    }
    case "cara": {
      y -= 11;
      ctx.out?.push(
        `q ${LINKA} RG 0.8 w ${x.toFixed(2)} ${y.toFixed(2)} m ${(x + sirka).toFixed(2)} ${y.toFixed(2)} l S Q`,
      );
      return y - 7;
    }
    case "mezera":
      return y - (prvek.vyska ?? 12);
    case "karta": {
      const vnitrni = sirka - KARTA.okraj * 2;
      let konec = y - KARTA.okraj;
      for (const dite of prvek.prvky) {
        konec = polozka(dite, x + KARTA.okraj, konec, vnitrni, { ...ctx, out: null });
      }
      const vyska = y - konec + KARTA.okraj;

      ctx.out?.push(
        "q",
        `${KARTA_BARVA} rg ${LINKA} RG 0.8 w`,
        zaobleny(x, y - vyska, sirka, vyska, KARTA.roh),
        "B",
        "Q",
      );

      let uvnitr = y - KARTA.okraj;
      for (const dite of prvek.prvky) {
        uvnitr = polozka(dite, x + KARTA.okraj, uvnitr, vnitrni, ctx);
      }
      return y - vyska - 11;
    }
  }
}

/** Výška prvku bez kreslení — pro rozhodnutí, jestli se ještě vejde. */
function vyska(prvek: Prvek, sirka: number, ctx: Kontext): number {
  return -polozka(prvek, 0, 0, sirka, { ...ctx, out: null });
}

export function pdfDokument(prvky: Prvek[], meta: PdfMeta): Buffer {
  const pouzite: Record<Rez, Set<number>> = {
    telo: new Set(),
    tucne: new Set(),
    nadpis: new Set(),
  };

  const stranky: string[][] = [];
  let proud: string[] = [];
  const zacatek = () => STRANA.vyska - OKRAJ.hlavicka - 20;
  let y = zacatek();

  const ctx: Kontext = { out: proud, pouzite };

  for (const [i, prvek] of prvky.entries()) {
    // Nadpis se láme i s tím, co po něm následuje. Bez toho zůstane sám
    // dole na straně a text k němu začne až na další — vypadá to jako
    // chyba sazby, protože to chyba sazby je.
    const dalsi = prvek.typ === "podnadpis" ? prvky[i + 1] : undefined;
    const potreba =
      vyska(prvek, SLOUPEC, ctx) + (dalsi ? vyska(dalsi, SLOUPEC, ctx) : 0);
    if (y - potreba < OKRAJ.paticka && proud.length > 0) {
      stranky.push(proud);
      proud = [];
      ctx.out = proud;
      y = zacatek();
    }
    y = polozka(prvek, OKRAJ.vlevo, y, SLOUPEC, ctx);
  }
  stranky.push(proud);

  /* Papír, hlavička a patička na každou stranu */
  const hotove: string[] = [];
  for (let i = 0; i < stranky.length; i += 1) {
    const ozdoby: string[] = [];
    const ozdobyCtx: Kontext = { out: ozdoby, pouzite };

    // Krémový papír přes celou stranu — stejná barva jako pozadí webu.
    ozdoby.push(`q ${PAPIR} rg 0 0 ${STRANA.sirka} ${STRANA.vyska} re f Q`);

    const vyskaZnaku = 22;
    const stredZnaku = STRANA.vyska - OKRAJ.hlavicka / 2 - 6;
    ozdoby.push(znak(OKRAJ.vlevo, stredZnaku, vyskaZnaku));
    textOps(
      ozdobyCtx,
      "Klidoo",
      17,
      OKRAJ.vlevo + sirkaZnaku(vyskaZnaku) + 10,
      stredZnaku - 6,
      INK,
      "nadpis",
    );
    const vpravo = i === 0 ? "klidoo.cz" : meta.titulek;
    if (vpravo) {
      textOps(
        ozdobyCtx,
        vpravo,
        9.5,
        STRANA.sirka - OKRAJ.vpravo - sirkaTextu(vpravo, 9.5),
        stredZnaku - 3,
        SLABA,
        "telo",
      );
    }
    const podHlavickou = STRANA.vyska - OKRAJ.hlavicka;
    ozdoby.push(
      `q ${LINKA} RG 0.8 w ${OKRAJ.vlevo} ${podHlavickou} m ${(STRANA.sirka - OKRAJ.vpravo).toFixed(2)} ${podHlavickou} l S Q`,
    );

    const nadPatickou = OKRAJ.paticka - 16;
    ozdoby.push(
      `q ${LINKA} RG 0.8 w ${OKRAJ.vlevo} ${nadPatickou} m ${(STRANA.sirka - OKRAJ.vpravo).toFixed(2)} ${nadPatickou} l S Q`,
    );
    if (meta.paticka) {
      textOps(ozdobyCtx, meta.paticka, VELIKOST.paticka, OKRAJ.vlevo, nadPatickou - 13, SLABA, "telo");
    }
    const cislo = `${i + 1} / ${stranky.length}`;
    textOps(
      ozdobyCtx,
      cislo,
      VELIKOST.paticka,
      STRANA.sirka - OKRAJ.vpravo - sirkaTextu(cislo, VELIKOST.paticka),
      nadPatickou - 13,
      SLABA,
      "telo",
    );

    hotove.push([...ozdoby, ...stranky[i]].join("\n"));
  }

  /* ── Objekty ─────────────────────────────────────────────────── */

  const objekty: Buffer[] = [];
  const pridej = (obsah: string | Buffer): number => {
    objekty.push(Buffer.isBuffer(obsah) ? obsah : Buffer.from(obsah, "latin1"));
    return objekty.length;
  };

  const idKatalog = 1;
  const idStrom = 2;
  const idInfo = 3;
  const REZY: Rez[] = ["telo", "tucne", "nadpis"];
  const idFontu: Record<Rez, number> = { telo: 0, tucne: 0, nadpis: 0 };

  pridej(`<< /Type /Catalog /Pages ${idStrom} 0 R >>`);
  pridej("");  // doplní se, až budou známé stránky
  pridej(`<< /Title (${pdfRetezec(meta.titulek)}) /Producer (${pdfRetezec(meta.autor ?? "Klidoo")}) >>`);

  for (const rez of REZY) {
    const p = pismo(rez);
    const naTisic = (v: number) => Math.round((v / p.jednotek) * 1000);
    const glyfy = [...pouzite[rez]].sort((a, b) => a - b);

    const idPopis = objekty.length + 2;
    const idSoubor = objekty.length + 3;
    const idToUnicode = objekty.length + 4;
    const idPotomek = objekty.length + 5;

    idFontu[rez] = pridej(
      `<< /Type /Font /Subtype /Type0 /BaseFont /${SOUBORY[rez].replace(".ttf", "")} ` +
        `/Encoding /Identity-H /DescendantFonts [${idPotomek} 0 R] /ToUnicode ${idToUnicode} 0 R >>`,
    );
    pridej(
      `<< /Type /FontDescriptor /FontName /${SOUBORY[rez].replace(".ttf", "")} /Flags 32 ` +
        `/FontBBox [${p.bbox.map(naTisic).join(" ")}] /ItalicAngle 0 ` +
        `/Ascent ${naTisic(p.ascent)} /Descent ${naTisic(p.descent)} ` +
        `/CapHeight ${naTisic(p.capHeight)} /StemV 80 /FontFile2 ${idSoubor} 0 R >>`,
    );
    pridej(
      Buffer.concat([
        Buffer.from(`<< /Length ${p.data.length} /Length1 ${p.data.length} >>\nstream\n`, "latin1"),
        p.data,
        Buffer.from("\nendstream", "latin1"),
      ]),
    );

    // Bez tohohle se z dokumentu nedá kopírovat text ani ho hledat.
    const obracene = new Map<number, number>();
    for (const [znakKod, g] of p.glyfy) {
      if (pouzite[rez].has(g) && !obracene.has(g)) obracene.set(g, znakKod);
    }
    const dvojice = [...obracene].map(
      ([g, kod]) => `<${g.toString(16).padStart(4, "0")}> <${kod.toString(16).padStart(4, "0")}>`,
    );
    const cmapText =
      "/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n" +
      "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n" +
      "/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n" +
      dvojice
        .reduce<string[][]>((skupiny, d, i) => {
          if (i % 100 === 0) skupiny.push([]);
          skupiny[skupiny.length - 1].push(d);
          return skupiny;
        }, [])
        .map((s) => `${s.length} beginbfchar\n${s.join("\n")}\nendbfchar\n`)
        .join("") +
      "endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend";
    pridej(`<< /Length ${Buffer.byteLength(cmapText, "latin1")} >>\nstream\n${cmapText}\nendstream`);

    const w = glyfy.map((g) => `${g} [${naTisic(p.sirky.get(g) ?? 0)}]`).join(" ");
    pridej(
      `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${SOUBORY[rez].replace(".ttf", "")} ` +
        `/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> ` +
        `/FontDescriptor ${idPopis} 0 R /DW 1000 /W [${w}] /CIDToGIDMap /Identity >>`,
    );
  }

  const zdroje =
    `/Resources << /Font << ${REZY.map((r) => `/F${POradi[r]} ${idFontu[r]} 0 R`).join(" ")} >> ` +
    "/ExtGState << /GSprolnuti << /Type /ExtGState /BM /Multiply >> >> >>";

  const idStranek: number[] = [];
  for (const obsah of hotove) {
    const idObsah = objekty.length + 2;
    idStranek.push(
      pridej(
        `<< /Type /Page /Parent ${idStrom} 0 R /MediaBox [0 0 ${STRANA.sirka} ${STRANA.vyska}] ` +
          `${zdroje} /Contents ${idObsah} 0 R >>`,
      ),
    );
    pridej(`<< /Length ${Buffer.byteLength(obsah, "latin1")} >>\nstream\n${obsah}\nendstream`);
  }

  objekty[idStrom - 1] = Buffer.from(
    `<< /Type /Pages /Count ${idStranek.length} /Kids [${idStranek.map((id) => `${id} 0 R`).join(" ")}] >>`,
    "latin1",
  );

  /* ── Sestavení souboru ───────────────────────────────────────── */

  const kusy: Buffer[] = [Buffer.from("%PDF-1.7\n%\xe2\xe3\xcf\xd3\n", "latin1")];
  let pozice = kusy[0].length;
  const odkazy: number[] = [];

  objekty.forEach((obsah, i) => {
    odkazy.push(pozice);
    const hlavicka = Buffer.from(`${i + 1} 0 obj\n`, "latin1");
    const paticka = Buffer.from("\nendobj\n", "latin1");
    kusy.push(hlavicka, obsah, paticka);
    pozice += hlavicka.length + obsah.length + paticka.length;
  });

  const xref = pozice;
  let tabulka = `xref\n0 ${objekty.length + 1}\n0000000000 65535 f \n`;
  for (const odkaz of odkazy) tabulka += `${String(odkaz).padStart(10, "0")} 00000 n \n`;
  tabulka +=
    `trailer\n<< /Size ${objekty.length + 1} /Root ${idKatalog} 0 R /Info ${idInfo} 0 R >>\n` +
    `startxref\n${xref}\n%%EOF\n`;
  kusy.push(Buffer.from(tabulka, "latin1"));

  return Buffer.concat(kusy);
}
