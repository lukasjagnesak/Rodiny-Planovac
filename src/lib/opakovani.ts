import { addMonths, addWeeks, addYears, isAfter, parseISO } from "date-fns";
import { toDateKey } from "./dates";

/**
 * Kdy má opakovaný výdaj vzniknout.
 *
 * Bez databáze a bez Supabase, aby se to dalo spočítat v testu — datumová
 * matematika je tiše zrádná a chyba se pozná až tím, že někomu chybí
 * výživné za únor.
 */

export type Frekvence = "tydne" | "mesicne" | "ctvrtletne" | "rocne";

export const FREKVENCE_POPIS: Record<Frekvence, string> = {
  tydne: "každý týden",
  mesicne: "každý měsíc",
  ctvrtletne: "každé čtvrtletí",
  rocne: "jednou ročně",
};

/**
 * Kolik termínů nejvíc vytvoříme v jednom běhu.
 *
 * Kdyby někdo zadal opakování od roku 2015, nemá cenu mu naráz vysypat
 * do výdajů sto položek. Zbytek dojde při dalších bězích — cron chodí
 * každou hodinu.
 */
export const MAX_TERMINU_ZA_BEH = 24;

/** N-tý termín od začátku. Počítá se od kotvy, ne od předchozího data. */
export function termin(zacina: Date, frekvence: Frekvence, poradi: number): Date {
  switch (frekvence) {
    case "tydne":
      return addWeeks(zacina, poradi);
    case "ctvrtletne":
      return addMonths(zacina, poradi * 3);
    case "rocne":
      return addYears(zacina, poradi);
    case "mesicne":
    default:
      return addMonths(zacina, poradi);
  }
}

export interface Sablona {
  zacina: string;
  konci?: string | null;
  frekvence: Frekvence;
}

/**
 * Termíny, které už měly nastat a ještě nejsou vytvořené.
 *
 * Dopředu se nic negeneruje: výdaj s datem v příštím měsíci by rozhodil
 * součty i vyrovnání za ten současný.
 *
 * `hotove` jsou dny, které v databázi už jsou — díky nim je celá funkce
 * idempotentní a nezáleží, kolikrát za den se pustí.
 */
export function chybejiciTerminy(
  sablona: Sablona,
  dnes: Date,
  hotove: string[] = [],
): string[] {
  const zacina = parseISO(sablona.zacina);
  if (Number.isNaN(zacina.getTime())) return [];

  const konec = sablona.konci ? parseISO(sablona.konci) : null;
  const hotoveSet = new Set(hotove);
  const vysledek: string[] = [];

  for (let i = 0; vysledek.length < MAX_TERMINU_ZA_BEH; i += 1) {
    const den = termin(zacina, sablona.frekvence, i);

    // Budoucnost necháváme být.
    if (isAfter(den, dnes)) break;
    if (konec && isAfter(den, konec)) break;

    const klic = toDateKey(den);
    if (!hotoveSet.has(klic)) vysledek.push(klic);

    // Pojistka proti nekonečné smyčce u nesmyslného zadání.
    if (i > 2000) break;
  }

  return vysledek;
}

/** Nejbližší budoucí termín — pro popisek „příště 1. dubna". */
export function pristiTermin(sablona: Sablona, dnes: Date): string | null {
  const zacina = parseISO(sablona.zacina);
  if (Number.isNaN(zacina.getTime())) return null;

  const konec = sablona.konci ? parseISO(sablona.konci) : null;

  for (let i = 0; i <= 2000; i += 1) {
    const den = termin(zacina, sablona.frekvence, i);
    if (konec && isAfter(den, konec)) return null;
    if (isAfter(den, dnes)) return toDateKey(den);
  }

  return null;
}
