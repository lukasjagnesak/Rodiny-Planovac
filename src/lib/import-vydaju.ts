import type { ExpenseCategory } from "./types";

/**
 * Čtení výdajů z tabulky.
 *
 * Podporuje se CSV, ne .xlsx. Excel uloží CSV jedním klikem, kdežto xlsx
 * je zabalené XML a jeho rozbalení by znamenalo přibrat knihovnu, jejíž
 * udržovaná verze není na npm. Radši jeden klik navíc než závislost,
 * které nevěřím.
 *
 * Zrádnosti, na které to tady musí být připravené:
 *  - český Excel odděluje středníkem, ne čárkou
 *  - desetinná čárka („1 234,50")
 *  - datum jako 15.3.2026 i 2026-03-15
 *  - Windows-1250 místo UTF-8 (řeší se při čtení souboru)
 *  - nezlomitelné mezery v částkách
 */

export interface RadekImportu {
  /** Číslo řádku v souboru — kvůli hlášení chyb. */
  cislo: number;
  datum: string | null;
  popis: string;
  castka: number | null;
  kategorie: ExpenseCategory | null;
  poznamka: string | null;
  chyba: string | null;
}

export interface VysledekCteni {
  hlavicka: string[];
  radky: RadekImportu[];
  oddelovac: string;
}

/** Oddělovač se pozná podle toho, kterého je v hlavičce nejvíc. */
export function urciOddelovac(prvniRadek: string): string {
  const kandidati = [";", ",", "\t"];
  let nejlepsi = ";";
  let nejvic = -1;

  for (const znak of kandidati) {
    const pocet = prvniRadek.split(znak).length - 1;
    if (pocet > nejvic) {
      nejvic = pocet;
      nejlepsi = znak;
    }
  }
  return nejlepsi;
}

/** Rozseká řádek CSV a respektuje uvozovky včetně zdvojených uvnitř. */
export function rozsekejRadek(radek: string, oddelovac: string): string[] {
  const bunky: string[] = [];
  let aktualni = "";
  let vUvozovkach = false;

  for (let i = 0; i < radek.length; i += 1) {
    const znak = radek[i];

    if (znak === '"') {
      if (vUvozovkach && radek[i + 1] === '"') {
        aktualni += '"';
        i += 1;
      } else {
        vUvozovkach = !vUvozovkach;
      }
    } else if (znak === oddelovac && !vUvozovkach) {
      bunky.push(aktualni.trim());
      aktualni = "";
    } else {
      aktualni += znak;
    }
  }

  bunky.push(aktualni.trim());
  return bunky;
}

/**
 * Částka z textu. Zvládne „1 234,50 Kč", „1.234,50", „-250" i „1234.5".
 * Vrací `null`, když v buňce žádné číslo není.
 */
export function prectiCastku(text: string): number | null {
  if (!text) return null;

  // Pryč s měnou, mezerami (i nezlomitelnými) a vším, co není číslo.
  let ocistene = text.replace(/[\s  ]/g, "").replace(/[^\d,.\-+]/g, "");
  if (!ocistene || !/\d/.test(ocistene)) return null;

  const posledniCarka = ocistene.lastIndexOf(",");
  const posledniTecka = ocistene.lastIndexOf(".");

  if (posledniCarka > -1 && posledniTecka > -1) {
    // Co je vzadu, to je desetinný oddělovač; to druhé odděluje tisíce.
    if (posledniCarka > posledniTecka) {
      ocistene = ocistene.replace(/\./g, "").replace(",", ".");
    } else {
      ocistene = ocistene.replace(/,/g, "");
    }
  } else if (posledniCarka > -1) {
    // Samotná čárka: desetinná, pokud za ní nejsou přesně tři číslice.
    const za = ocistene.length - posledniCarka - 1;
    ocistene = za === 3 ? ocistene.replace(/,/g, "") : ocistene.replace(",", ".");
  }

  const cislo = Number(ocistene);
  return Number.isFinite(cislo) ? cislo : null;
}

/** Datum z textu na `YYYY-MM-DD`. */
export function prectiDatum(text: string): string | null {
  if (!text) return null;
  const ocistene = text.trim();

  const iso = ocistene.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return slozDatum(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  // 15.3.2026, 15. 3. 2026, 15/03/2026
  const cesky = ocistene.match(/^(\d{1,2})[.\/\s]+(\d{1,2})[.\/\s]+(\d{2,4})/);
  if (cesky) {
    const rok = Number(cesky[3]);
    return slozDatum(rok < 100 ? 2000 + rok : rok, Number(cesky[2]), Number(cesky[1]));
  }

  return null;
}

function slozDatum(rok: number, mesic: number, den: number): string | null {
  if (mesic < 1 || mesic > 12 || den < 1 || den > 31) return null;
  const datum = new Date(Date.UTC(rok, mesic - 1, den));
  // Ošetří 31. 2. — Date by ho posunul na březen.
  if (datum.getUTCMonth() !== mesic - 1 || datum.getUTCDate() !== den) return null;
  return `${rok}-${String(mesic).padStart(2, "0")}-${String(den).padStart(2, "0")}`;
}

/** Podle názvů sloupců odhadne, co je co. */
const NAZVY = {
  datum: ["datum", "date", "den", "zaplaceno", "datum platby"],
  popis: ["popis", "nazev", "název", "polozka", "položka", "text", "description", "co"],
  castka: ["castka", "částka", "cena", "suma", "amount", "kč", "czk", "hodnota"],
  kategorie: ["kategorie", "category", "druh", "typ", "okruh"],
  poznamka: ["poznamka", "poznámka", "note", "detail"],
};

export type Sloupce = Record<keyof typeof NAZVY, number>;

export function odhadniSloupce(hlavicka: string[]): Sloupce {
  const normalizovana = hlavicka.map((h) => h.toLowerCase().trim());
  const vysledek = { datum: -1, popis: -1, castka: -1, kategorie: -1, poznamka: -1 };

  for (const [klic, varianty] of Object.entries(NAZVY) as [keyof Sloupce, string[]][]) {
    vysledek[klic] = normalizovana.findIndex((h) =>
      varianty.some((v) => h === v || h.includes(v)),
    );
  }
  return vysledek;
}

/** Kategorie se hádá z textu — kdo si ji v tabulce vedl, ať ji nezadává znovu. */
const KATEGORIE: [ExpenseCategory, string[]][] = [
  ["alimony", ["výživn", "vyzivn", "aliment"]],
  ["activities", ["kroužek", "krouzek", "sport", "trénink", "trenink", "tábor", "tabor"]],
  ["clothing", ["oblečen", "oblecen", "boty", "bunda", "kalhoty", "mikina"]],
  ["school", ["škol", "skol", "družin", "druzin", "učebnic", "ucebnic", "sešit", "sesit"]],
  ["health", ["lékař", "lekar", "zub", "léky", "leky", "brýle", "bryle", "očkov"]],
  ["food", ["jídl", "jidl", "oběd", "obed", "svačin", "svacin", "strav"]],
  ["travel", ["výlet", "vylet", "doprav", "jízdenk", "jizdenk", "vlak"]],
  ["fun", ["kino", "divadl", "dárek", "darek", "zábav", "zabav", "hračk", "hrack"]],
];

export function odhadniKategorii(text: string): ExpenseCategory | null {
  const nizky = text.toLowerCase();
  for (const [kategorie, slova] of KATEGORIE) {
    if (slova.some((s) => nizky.includes(s))) return kategorie;
  }
  return null;
}

/** Přečte celý obsah souboru. Kontroluje jen to, bez čeho výdaj nedává smysl. */
export function prectiCsv(obsah: string, sloupceRucne?: Partial<Sloupce>): VysledekCteni {
  // BOM na začátku by se jinak stal součástí prvního názvu sloupce.
  const text = obsah.replace(/^﻿/, "");
  const radky = text.split(/\r?\n/).filter((r) => r.trim().length > 0);

  if (radky.length === 0) {
    return { hlavicka: [], radky: [], oddelovac: ";" };
  }

  const oddelovac = urciOddelovac(radky[0]);
  const hlavicka = rozsekejRadek(radky[0], oddelovac);
  const sloupce = { ...odhadniSloupce(hlavicka), ...sloupceRucne };

  const vysledek: RadekImportu[] = [];

  for (let i = 1; i < radky.length; i += 1) {
    const bunky = rozsekejRadek(radky[i], oddelovac);
    const vezmi = (index: number) => (index >= 0 ? (bunky[index] ?? "") : "");

    const popis = vezmi(sloupce.popis);
    const castka = prectiCastku(vezmi(sloupce.castka));
    const datum = prectiDatum(vezmi(sloupce.datum));
    const zTabulky = vezmi(sloupce.kategorie);

    const chyby: string[] = [];
    if (castka === null) chyby.push("chybí částka");
    if (!popis.trim()) chyby.push("chybí popis");

    vysledek.push({
      cislo: i + 1,
      datum,
      popis: popis.trim(),
      castka,
      kategorie: odhadniKategorii(`${zTabulky} ${popis}`),
      poznamka: vezmi(sloupce.poznamka).trim() || null,
      chyba: chyby.length > 0 ? chyby.join(", ") : null,
    });
  }

  return { hlavicka, radky: vysledek, oddelovac };
}
