/**
 * Slovník hlavních vět značky — jediný zdroj pro web, registraci,
 * e-maily a reklamy.
 *
 * Master brief 2026 (kap. 2.4) chce, aby každé veřejné sdělení mělo
 * stejný benefit, cenu, oslovení i definici sdílení dat. Ruční přepis
 * v každé komponentě se dřív rozjel (tykání, jiná cena, „doklady" pro
 * profesionály). Tady stojí věty, které se smějí měnit jen společně —
 * a test `test:konzistence` hlídá, že ceny jinde napsané nejsou.
 *
 * Ceny a nabídka: `tarify.ts`. Počet volných míst: databáze.
 */

/** Definice značky — doslovně podle master briefu. */
export const DEFINICE =
  "Klidoo je aplikace pro rodiče, kteří organizují péči o děti mezi dvěma domácnostmi. " +
  "Pomáhá zvládat kalendář, předávky, kroužky a výdaje bez zbytečného hledání informací.";

export const TAGLINE = "Dvě domácnosti. Jedno dětství.";

/** Hlavní popis (H1 homepage). */
export const HLAVNI_POPIS = "Střídavá péče. Vše důležité na jednom místě.";

/** Tři benefity homepage („školní akce a rozvrhy" — rozhodnutí 5. 11. 2026). */
export const BENEFITY = [
  "Předávky bez hledání ve zprávách.",
  "Kroužky, školní akce a rozvrhy přehledně.",
  "Výdaje a účtenky podle vaší dohody.",
] as const;

/** Ujištění u každé výzvy k registraci. */
export const BEZ_KARTY = "Bez platební karty";
export const BEZ_AUTOMATICKE_PLATBY = "Bez karty. Bez automatické platby.";
export const DRUHY_RODIC = "Druhý rodič bez dalšího poplatku.";
export const PRO_JEDNOHO = "Funguje i pro jednoho rodiče";

/**
 * Kdo co vidí — jedna definice pro kartu soukromí, ceník i stránku
 * Bezpečnost. Musí odpovídat oprávněním v databázi (test
 * `tests/db/bezpecnost.sql`): doklady dětí vidí rodiče a pečující,
 * člen jen ke čtení ne.
 */
export const SOUKROMI = {
  nadpis: "Vaše rodinné údaje nejsou veřejné.",
  text:
    "Kalendář, údaje o dětech a dokumenty jsou přístupné jen členům rodiny, které sami pozvete. " +
    "Data jsou uložená na serverech v EU.",
} as const;

/** Po skončení období zdarma — jen to, co systém opravdu dělá. */
export const PO_SKONCENI =
  "Nic se samo nestrhne a nic se nesmaže. Zamkne se jen zapisování, dokud se nerozhodnete pokračovat.";
