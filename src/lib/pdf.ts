/**
 * Minimální zapisovač PDF s vloženým písmem.
 *
 * Existuje kvůli jediné věci: čeština. Standardní fonty v PDF neznají
 * č, ř, ě ani ů, takže dokument bez vloženého písma se rozsype. Proto
 * se sem vkládá Liberation Sans (SIL OFL, licence v `public/fonty/`).
 *
 * Písmo je jen jedno a tučné se dělá obtažením (`2 Tr`). Druhý řez by
 * zdvojnásobil velikost přílohy a u dokumentu, který má jednu stránku
 * nadpisů, se to nevyplatí.
 *
 * Co to neumí: obrázky, tabulky s rámečky, dělení slov, víc písem.
 * Až bude potřeba něco z toho, je čas sáhnout po knihovně.
 */

import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

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

let ulozene: Pismo | null = null;

function pismo(): Pismo {
  if (!ulozene) {
    ulozene = nactiPismo(
      join(process.cwd(), "public", "fonty", "LiberationSans-Regular.ttf"),
    );
  }
  return ulozene;
}

/* ── Měření a kódování textu ───────────────────────────────────── */

/** Neznámý znak nahradí otazníkem, ať dokument nespadne kvůli emoji. */
function glyf(p: Pismo, znak: number): number {
  return p.glyfy.get(znak) ?? p.glyfy.get(0x003f) ?? 0;
}

export function sirkaTextu(text: string, velikost: number): number {
  const p = pismo();
  let soucet = 0;
  for (const znak of text) {
    soucet += p.sirky.get(glyf(p, znak.codePointAt(0)!)) ?? 0;
  }
  return (soucet / p.jednotek) * velikost;
}

function hexGlyfy(text: string, pouzite: Set<number>): string {
  const p = pismo();
  let out = "";
  for (const znak of text) {
    const g = glyf(p, znak.codePointAt(0)!);
    pouzite.add(g);
    out += g.toString(16).padStart(4, "0");
  }
  return out;
}

/** Zalomení na šířku sloupce. Dělení slov neumíme, dlouhé slovo přeteče. */
export function zalom(text: string, velikost: number, sirka: number): string[] {
  const radky: string[] = [];
  for (const odstavec of text.split("\n")) {
    let radek = "";
    for (const slovo of odstavec.split(/\s+/).filter(Boolean)) {
      const zkouska = radek ? `${radek} ${slovo}` : slovo;
      if (radek && sirkaTextu(zkouska, velikost) > sirka) {
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
  | { typ: "nadpis"; text: string }
  | { typ: "podnadpis"; text: string }
  | { typ: "odstavec"; text: string }
  | { typ: "radek"; vlevo: string; vpravo: string; silny?: boolean }
  | { typ: "cislo"; popis: string; hodnota: string }
  | { typ: "cara" }
  | { typ: "mezera"; vyska?: number };

const STRANA = { sirka: 595.28, vyska: 841.89 };
const OKRAJ = { vlevo: 56, vpravo: 56, nahore: 64, dole: 64 };
const SLOUPEC = STRANA.sirka - OKRAJ.vlevo - OKRAJ.vpravo;

const SEDA = "0.42 0.42 0.4";
const CERNA = "0.13 0.13 0.12";
const LINKA = "0.82 0.82 0.8";

/* ── Skládání PDF ──────────────────────────────────────────────── */

function pdfRetezec(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export interface PdfMeta {
  titulek: string;
  autor?: string;
  paticka?: string;
}

export function pdfDokument(prvky: Prvek[], meta: PdfMeta): Buffer {
  const p = pismo();
  const pouzite = new Set<number>();
  const stranky: string[] = [];

  let proud: string[] = [];
  let y = STRANA.vyska - OKRAJ.nahore;

  const novaStrana = () => {
    if (proud.length) stranky.push(proud.join("\n"));
    proud = [];
    y = STRANA.vyska - OKRAJ.nahore;
  };

  const misto = (vyska: number) => {
    if (y - vyska < OKRAJ.dole) novaStrana();
  };

  const napis = (
    text: string,
    velikost: number,
    x: number,
    barva: string,
    tucne = false,
  ) => {
    proud.push("BT");
    proud.push(`${barva} rg`);
    if (tucne) {
      // Obtažení místo druhého řezu písma: síla je zlomek velikosti,
      // aby to v osmi i ve dvaceti bodech vypadalo stejně.
      proud.push(`${barva} RG`, `${(velikost * 0.028).toFixed(3)} w`, "2 Tr");
    } else {
      proud.push("0 Tr");
    }
    proud.push(`/F1 ${velikost} Tf`, `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`);
    proud.push(`<${hexGlyfy(text, pouzite)}> Tj`);
    proud.push("ET");
  };

  for (const prvek of prvky) {
    switch (prvek.typ) {
      case "nadpis": {
        const velikost = 20;
        for (const radek of zalom(prvek.text, velikost, SLOUPEC)) {
          misto(velikost * 1.35);
          y -= velikost * 1.1;
          napis(radek, velikost, OKRAJ.vlevo, CERNA, true);
        }
        y -= 10;
        break;
      }
      case "podnadpis": {
        const velikost = 12.5;
        misto(velikost * 2.4);
        y -= velikost * 2;
        napis(prvek.text, velikost, OKRAJ.vlevo, CERNA, true);
        y -= 4;
        break;
      }
      case "odstavec": {
        const velikost = 10.5;
        for (const radek of zalom(prvek.text, velikost, SLOUPEC)) {
          misto(velikost * 1.6);
          y -= velikost * 1.55;
          napis(radek, velikost, OKRAJ.vlevo, SEDA);
        }
        y -= 5;
        break;
      }
      case "radek": {
        const velikost = 10.5;
        misto(velikost * 1.9);
        y -= velikost * 1.75;
        napis(prvek.vlevo, velikost, OKRAJ.vlevo, SEDA);
        const sirka = sirkaTextu(prvek.vpravo, velikost);
        napis(
          prvek.vpravo,
          velikost,
          STRANA.sirka - OKRAJ.vpravo - sirka,
          CERNA,
          prvek.silny,
        );
        break;
      }
      case "cislo": {
        misto(46);
        y -= 20;
        napis(prvek.popis, 10, OKRAJ.vlevo, SEDA);
        y -= 24;
        napis(prvek.hodnota, 22, OKRAJ.vlevo, CERNA, true);
        y -= 6;
        break;
      }
      case "cara": {
        misto(16);
        y -= 10;
        proud.push(
          `${LINKA} RG`,
          "0.7 w",
          `${OKRAJ.vlevo} ${y.toFixed(2)} m ${(STRANA.sirka - OKRAJ.vpravo).toFixed(2)} ${y.toFixed(2)} l S`,
        );
        y -= 6;
        break;
      }
      case "mezera": {
        y -= prvek.vyska ?? 12;
        break;
      }
    }
  }

  if (proud.length) stranky.push(proud.join("\n"));
  if (stranky.length === 0) stranky.push("");

  // Patička až nakonec: musí být na každé stránce včetně té poslední.
  if (meta.paticka) {
    const velikost = 8.5;
    for (let i = 0; i < stranky.length; i += 1) {
      const text = `${meta.paticka}  ·  strana ${i + 1} z ${stranky.length}`;
      const x = OKRAJ.vlevo;
      const yp = OKRAJ.dole - 24;
      stranky[i] +=
        `\nBT\n${SEDA} rg\n0 Tr\n/F1 ${velikost} Tf\n1 0 0 1 ${x} ${yp} Tm\n` +
        `<${hexGlyfy(text, pouzite)}> Tj\nET`;
    }
  }

  /* Objekty */
  const objekty: Buffer[] = [];
  const pridej = (obsah: string | Buffer): number => {
    objekty.push(Buffer.isBuffer(obsah) ? obsah : Buffer.from(obsah, "latin1"));
    return objekty.length;
  };

  const cisloStranek = stranky.length;
  const idKatalog = 1;
  const idStrom = 2;
  const idFont = 3;
  const idPotomek = 4;
  const idPopis = 5;
  const idSoubor = 6;
  const idToUnicode = 7;
  const idInfo = 8;
  const prvniStrana = 9;

  const idStranky = Array.from({ length: cisloStranek }, (_, i) => prvniStrana + i * 2);
  const idObsahy = idStranky.map((id) => id + 1);

  pridej(`<< /Type /Catalog /Pages ${idStrom} 0 R >>`);
  pridej(
    `<< /Type /Pages /Count ${cisloStranek} /Kids [${idStranky.map((id) => `${id} 0 R`).join(" ")}] >>`,
  );
  pridej(
    `<< /Type /Font /Subtype /Type0 /BaseFont /LiberationSans /Encoding /Identity-H ` +
      `/DescendantFonts [${idPotomek} 0 R] /ToUnicode ${idToUnicode} 0 R >>`,
  );

  const naTisic = (v: number) => Math.round((v / p.jednotek) * 1000);
  const seznamGlyfu = [...pouzite].sort((a, b) => a - b);
  const w = seznamGlyfu.map((g) => `${g} [${naTisic(p.sirky.get(g) ?? 0)}]`).join(" ");
  pridej(
    `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /LiberationSans ` +
      `/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> ` +
      `/FontDescriptor ${idPopis} 0 R /DW 1000 /W [${w}] /CIDToGIDMap /Identity >>`,
  );
  pridej(
    `<< /Type /FontDescriptor /FontName /LiberationSans /Flags 32 ` +
      `/FontBBox [${p.bbox.map(naTisic).join(" ")}] /ItalicAngle 0 ` +
      `/Ascent ${naTisic(p.ascent)} /Descent ${naTisic(p.descent)} ` +
      `/CapHeight ${naTisic(p.capHeight)} /StemV 80 /FontFile2 ${idSoubor} 0 R >>`,
  );
  pridej(
    Buffer.concat([
      Buffer.from(
        `<< /Length ${p.data.length} /Length1 ${p.data.length} >>\nstream\n`,
        "latin1",
      ),
      p.data,
      Buffer.from("\nendstream", "latin1"),
    ]),
  );

  // Bez tohohle se z dokumentu nedá kopírovat text ani ho hledat.
  const obraceneGlyfy = new Map<number, number>();
  for (const [znak, g] of p.glyfy) if (pouzite.has(g) && !obraceneGlyfy.has(g)) obraceneGlyfy.set(g, znak);
  const dvojice = [...obraceneGlyfy].map(
    ([g, znak]) => `<${g.toString(16).padStart(4, "0")}> <${znak.toString(16).padStart(4, "0")}>`,
  );
  const cmapText =
    `/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n` +
    `/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n` +
    `/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n` +
    dvojice
      .reduce<string[][]>((skupiny, d, i) => {
        if (i % 100 === 0) skupiny.push([]);
        skupiny[skupiny.length - 1].push(d);
        return skupiny;
      }, [])
      .map((s) => `${s.length} beginbfchar\n${s.join("\n")}\nendbfchar\n`)
      .join("") +
    `endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend`;
  pridej(`<< /Length ${Buffer.byteLength(cmapText, "latin1")} >>\nstream\n${cmapText}\nendstream`);

  pridej(
    `<< /Title (${pdfRetezec(meta.titulek)}) /Producer (${pdfRetezec(meta.autor ?? "Klidoo")}) >>`,
  );

  for (let i = 0; i < cisloStranek; i += 1) {
    pridej(
      `<< /Type /Page /Parent ${idStrom} 0 R /MediaBox [0 0 ${STRANA.sirka} ${STRANA.vyska}] ` +
        `/Resources << /Font << /F1 ${idFont} 0 R >> >> /Contents ${idObsahy[i]} 0 R >>`,
    );
    const obsah = stranky[i];
    pridej(
      `<< /Length ${Buffer.byteLength(obsah, "latin1")} >>\nstream\n${obsah}\nendstream`,
    );
  }

  /* Sestavení souboru */
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
