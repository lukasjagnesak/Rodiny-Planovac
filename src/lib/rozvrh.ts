import { getISOWeek } from "date-fns";
import type { RozvrhHodina, RozvrhParita } from "./types";

/**
 * Výchozí časy zvonění na českých základních školách. Slouží jen jako
 * návrh při zakládání hodiny — uložený čas je vždy ten u konkrétní
 * hodiny, protože zvonění se škola od školy liší.
 */
export const ZVONENI: { poradi: number; zacatek: string; konec: string }[] = [
  { poradi: 0, zacatek: "07:00", konec: "07:45" },
  { poradi: 1, zacatek: "08:00", konec: "08:45" },
  { poradi: 2, zacatek: "08:55", konec: "09:40" },
  { poradi: 3, zacatek: "10:00", konec: "10:45" },
  { poradi: 4, zacatek: "10:55", konec: "11:40" },
  { poradi: 5, zacatek: "11:50", konec: "12:35" },
  { poradi: 6, zacatek: "12:45", konec: "13:30" },
  { poradi: 7, zacatek: "13:40", konec: "14:25" },
  { poradi: 8, zacatek: "14:35", konec: "15:20" },
  { poradi: 9, zacatek: "15:30", konec: "16:15" },
  { poradi: 10, zacatek: "16:25", konec: "17:10" },
];

export function vychoziCasy(poradi: number): { zacatek: string; konec: string } {
  return ZVONENI[poradi] ?? { zacatek: "08:00", konec: "08:45" };
}

export const PARITA_LABELS: Record<RozvrhParita, string> = {
  vzdy: "Každý týden",
  sudy: "Jen sudý týden",
  lichy: "Jen lichý týden",
};

/** Den v týdnu jako 1–7 (pondělí–neděle), stejně jako to má databáze. */
export function denVTydnu(date: Date): number {
  return ((date.getDay() + 6) % 7) + 1;
}

/** Platí hodina v týdnu, do kterého spadá tohle datum? */
export function paritaPlati(parita: RozvrhParita, date: Date): boolean {
  if (parita === "vzdy") return true;
  const sudy = getISOWeek(date) % 2 === 0;
  return parita === "sudy" ? sudy : !sudy;
}

/** Hodiny pro konkrétní den, seřazené a bez těch z jiné parity týdne. */
export function hodinyDne(hodiny: RozvrhHodina[], date: Date): RozvrhHodina[] {
  const den = denVTydnu(date);
  return hodiny
    .filter((h) => h.den === den && paritaPlati(h.parita, date))
    .sort((a, b) => a.poradi - b.poradi);
}

/**
 * Kdy dítě ten den končí ve škole. Tohle je ta informace, kvůli které
 * rozvrh v aplikaci vůbec je — podle ní se plánuje předání i odvoz.
 */
export function konecVyucovani(hodiny: RozvrhHodina[], date: Date): string | null {
  const dnesni = hodinyDne(hodiny, date);
  if (dnesni.length === 0) return null;
  return dnesni[dnesni.length - 1].konec.slice(0, 5);
}

export function zacatekVyucovani(hodiny: RozvrhHodina[], date: Date): string | null {
  const dnesni = hodinyDne(hodiny, date);
  if (dnesni.length === 0) return null;
  return dnesni[0].zacatek.slice(0, 5);
}

/** Kolik hodin týdně dítě má — počítá se jen to, co platí každý týden, plus průměr sudého a lichého. */
export function hodinTydne(hodiny: RozvrhHodina[]): number {
  const vzdy = hodiny.filter((h) => h.parita === "vzdy").length;
  const sudy = hodiny.filter((h) => h.parita === "sudy").length;
  const lichy = hodiny.filter((h) => h.parita === "lichy").length;
  return vzdy + Math.round((sudy + lichy) / 2);
}

/** Používá rozvrh dítěte vůbec sudé/liché týdny? Podle toho se schová přepínač. */
export function maParitu(hodiny: RozvrhHodina[]): boolean {
  return hodiny.some((h) => h.parita !== "vzdy");
}

/** Jedna hodina tak, jak ji ten den viděl EduPage. */
export interface PozorovanaHodina {
  den: number;
  /** Konkrétní datum pozorování — kvůli změnám, které platí jen ten den. */
  datum: string;
  tyden: number;
  poradi: number;
  predmet: string;
  ucebna: string | null;
  ucitel: string | null;
  zacatek: string;
  konec: string;
  /** EduPage hodinu ten den škrtlo — odpadá. */
  zruseno?: boolean;
  /** Místo hodiny je ten den školní akce. */
  akce?: boolean;
}

/** Odchylka od stálého rozvrhu, platná na jeden konkrétní den. */
export interface ZmenaVRozvrhu {
  den: string;
  poradi: number;
  druh: "zruseno" | "navic" | "zmena";
  predmet: string | null;
  ucebna: string | null;
  zacatek: string | null;
  konec: string | null;
}

export interface SlozenaHodina {
  den: number;
  poradi: number;
  predmet: string;
  ucebna: string | null;
  ucitel: string | null;
  zacatek: string;
  konec: string;
  parita: RozvrhParita;
}

function otisk(h: PozorovanaHodina): string {
  return `${h.predmet}|${h.zacatek}|${h.konec}|${h.ucebna ?? ""}`;
}

/**
 * Poskládá stažená pozorování do týdenního rozvrhu.
 *
 * EduPage nic neříká o tom, jestli škola jede na sudý a lichý týden —
 * pozná se to jedině tak, že se dva po sobě jdoucí týdny liší. Když je
 * v datech jen jeden týden, nemáme co porovnávat a všechno platí vždy.
 */
export function slozRozvrh(vsechna: PozorovanaHodina[]): SlozenaHodina[] {
  // Odpadlá hodina pořád říká, co v tom místě normálně bývá — do skládání
  // patří. Školní akce na místě hodiny ne, ta je jednorázová a přebila by
  // skutečný předmět.
  const pozorovani = vsechna.filter((h) => !h.akce);

  const tydny = new Set(pozorovani.map((h) => h.tyden));
  const rozlisovat = tydny.size >= 2;

  const skupiny = new Map<string, PozorovanaHodina[]>();
  for (const h of pozorovani) {
    const klic = `${h.den}|${h.poradi}`;
    const seznam = skupiny.get(klic);
    if (seznam) seznam.push(h);
    else skupiny.set(klic, [h]);
  }

  const vysledek: SlozenaHodina[] = [];

  for (const skupina of skupiny.values()) {
    const jako = (h: PozorovanaHodina, parita: RozvrhParita): SlozenaHodina => ({
      den: h.den,
      poradi: h.poradi,
      predmet: h.predmet,
      ucebna: h.ucebna,
      ucitel: h.ucitel,
      zacatek: h.zacatek,
      konec: h.konec,
      parita,
    });

    if (!rozlisovat) {
      vysledek.push(jako(skupina[0], "vzdy"));
      continue;
    }

    const sudy = skupina.find((h) => h.tyden % 2 === 0);
    const lichy = skupina.find((h) => h.tyden % 2 !== 0);

    if (sudy && lichy && otisk(sudy) === otisk(lichy)) {
      vysledek.push(jako(sudy, "vzdy"));
      continue;
    }
    if (sudy) vysledek.push(jako(sudy, "sudy"));
    if (lichy) vysledek.push(jako(lichy, "lichy"));
  }

  return vysledek.sort((a, b) => a.den - b.den || a.poradi - b.poradi);
}

/**
 * Co se v konkrétní dny liší od stálého rozvrhu.
 *
 * Hlásí se jen to, co EduPage samo označí — odpadlou hodinu a školní akci
 * na místě hodiny. Dopočítávat další rozdíly nemá cenu: stálý rozvrh se
 * skládá ze stejných dat, takže by šlo o vlastní ozvěnu, ne o změnu.
 */
export function zmenyZPozorovani(pozorovani: PozorovanaHodina[]): ZmenaVRozvrhu[] {
  const zmeny: ZmenaVRozvrhu[] = [];

  for (const h of pozorovani) {
    const druh = h.zruseno ? "zruseno" : h.akce ? "zmena" : null;
    if (!druh) continue;

    zmeny.push({
      den: h.datum,
      poradi: h.poradi,
      druh,
      predmet: h.predmet,
      ucebna: h.ucebna,
      zacatek: h.zacatek,
      konec: h.konec,
    });
  }

  // Na jedno místo v jednom dni patří jedna změna.
  const jedinecne = new Map<string, ZmenaVRozvrhu>();
  for (const z of zmeny) jedinecne.set(`${z.den}|${z.poradi}`, z);

  return [...jedinecne.values()].sort(
    (a, b) => a.den.localeCompare(b.den) || a.poradi - b.poradi,
  );
}

/** Hodiny dne po zohlednění změn — odpadlé se vyhodí. */
export function hodinyDneSeZmenami(
  hodiny: RozvrhHodina[],
  zmeny: { den: string; poradi: number; druh: string }[],
  date: Date,
): RozvrhHodina[] {
  const denKlic = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

  const zrusene = new Set(
    zmeny.filter((z) => z.den === denKlic && z.druh === "zruseno").map((z) => z.poradi),
  );

  return hodinyDne(hodiny, date).filter((h) => !zrusene.has(h.poradi));
}
