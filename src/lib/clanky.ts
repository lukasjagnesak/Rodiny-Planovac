/**
 * Seznam článků a příběhů.
 *
 * Texty mají **datum vydání v budoucnu** a do té doby se nikde
 * neobjevují — ani ve výpisu, ani v mapě webu, a na přímý odkaz vrátí
 * 404. Je to plánovaný kalendář obsahu, ne archiv: napíše se to jednou
 * dopředu a vychází to samo.
 *
 * Nevýhodu je potřeba znát: vyhledávač text najde až v den vydání,
 * takže na vyšplhání ve výsledcích má míň času. Když je to u konkrétního
 * článku důležitější než načasování, stačí u něj posunout `datum`
 * dozadu — nic jiného se měnit nemusí.
 */

import type { Clanek } from "./clanky-typy";
import { noci } from "../obsah/clanky/noci";
import { dohoda } from "../obsah/clanky/dohoda";
import { prazdniny } from "../obsah/clanky/prazdniny";
import { ctyriMesice } from "../obsah/clanky/ctyri-mesice";
import { vanoce } from "../obsah/clanky/vanoce";
import { prvniVanoce } from "../obsah/clanky/prvni-vanoce";
import { konecRoku } from "../obsah/clanky/konec-roku";

export const VSECHNY: Clanek[] = [
  noci,
  dohoda,
  prazdniny,
  ctyriMesice,
  vanoce,
  prvniVanoce,
  konecRoku,
];

/** Vyšlo už to? Porovnává se na dny, ne na hodiny. */
export function jeVydany(clanek: Clanek, ted: Date): boolean {
  return clanek.datum <= ted.toISOString().slice(0, 10);
}

/** Vydané texty, od nejnovějšího. */
export function vydane(ted: Date = new Date()): Clanek[] {
  return VSECHNY.filter((c) => jeVydany(c, ted)).sort((a, b) =>
    b.datum.localeCompare(a.datum),
  );
}

/** `null` i pro text, který teprve vyjde — návštěvník ho vidět nemá. */
export function najdi(slug: string, ted: Date = new Date()): Clanek | null {
  const clanek = VSECHNY.find((c) => c.slug === slug);
  if (!clanek || !jeVydany(clanek, ted)) return null;
  return clanek;
}
