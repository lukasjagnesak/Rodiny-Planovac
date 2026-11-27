/**
 * Kód na výpisu: „K7F3-9QX2".
 *
 * Osm znaků z 31, tedy přes 850 miliard možností — uhodnout cizí kód
 * nejde, a ověřovací stránka má navíc limit pokusů. Bez 0/O, 1/I/L,
 * ať se kód z papíru přepíše bez chyby; malá písmena i mezery se při
 * zadání srovnají.
 */
export const ABECEDA_KODU = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function novyKod(nahodne: Uint8Array = crypto.getRandomValues(new Uint8Array(8))): string {
  const znaky = [...nahodne.slice(0, 8)].map((b) => ABECEDA_KODU[b % ABECEDA_KODU.length]);
  return `${znaky.slice(0, 4).join("")}-${znaky.slice(4).join("")}`;
}

/** Srovná, co člověk napsal: malá písmena, mezery, chybějící pomlčka, O místo 0… */
export function normalizujKod(vstup: string): string | null {
  const ciste = vstup
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  // 0 a 1 v abecedě nejsou — po záměně je kód neplatný, a to je správně:
  // člověk spíš přepsal něco jiného, než aby kód obsahoval O.
  if (ciste.length !== 8 || [...ciste].some((z) => !ABECEDA_KODU.includes(z))) return null;
  return `${ciste.slice(0, 4)}-${ciste.slice(4)}`;
}
