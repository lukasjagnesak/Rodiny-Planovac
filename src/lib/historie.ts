/**
 * Historie změn — popisky a výpis. Bez databáze, ať jde otestovat.
 *
 * Záznamy zapisuje databáze sama (migrace 0034); tady se jen čtou.
 */
import type { ZaznamHistorie } from "./types";

export const OBLASTI: Record<ZaznamHistorie["oblast"], string> = {
  rozvrh: "Rozvrh",
  vydaje: "Výdaje",
  udalosti: "Události",
  krouzky: "Kroužky",
  deti: "Děti",
  clenove: "Členové rodiny",
  vypisy: "Výpisy",
};

const PRAHA = "Europe/Prague";

/** „27. 10. 2026" v pražském čase. */
export function denZaznamu(kdy: string): string {
  return new Date(kdy).toLocaleDateString("cs-CZ", { timeZone: PRAHA });
}

/** „14:03" v pražském čase. */
export function casZaznamu(kdy: string): string {
  return new Date(kdy).toLocaleTimeString("cs-CZ", {
    timeZone: PRAHA,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Seskupí po dnech, nejnovější nahoře; pořadí uvnitř dne zachová. */
export function poDnech(zaznamy: ZaznamHistorie[]): { den: string; zaznamy: ZaznamHistorie[] }[] {
  const dny: { den: string; zaznamy: ZaznamHistorie[] }[] = [];
  for (const z of zaznamy) {
    const den = denZaznamu(z.kdy);
    const posledni = dny.at(-1);
    if (posledni && posledni.den === den) posledni.zaznamy.push(z);
    else dny.push({ den, zaznamy: [z] });
  }
  return dny;
}

type Odstavec = { druh: "nadpis1" | "nadpis2" | "text" | "drobne"; text: string };

/** Odstavce pro výpis do Wordu. Záznamy od nejstaršího — tak se čte spis. */
export function vypisHistorie(zaznamy: ZaznamHistorie[], rodina: string): Odstavec[] {
  const odstavce: Odstavec[] = [{ druh: "nadpis1", text: `Historie změn — ${rodina}` }];
  if (zaznamy.length === 0) {
    odstavce.push({ druh: "text", text: "Zatím žádné zaznamenané změny." });
    return odstavce;
  }

  const odNejstarsiho = [...zaznamy].sort((a, b) => a.kdy.localeCompare(b.kdy));
  odstavce.push({
    druh: "drobne",
    text:
      `${odNejstarsiho.length} záznamů od ${denZaznamu(odNejstarsiho[0].kdy)} do ` +
      `${denZaznamu(odNejstarsiho.at(-1)!.kdy)}. Záznamy zapisuje databáze Klidoo sama při ` +
      "každé změně; nikdo z rodičů je nemůže upravit ani smazat.",
  });

  let den = "";
  for (const z of odNejstarsiho) {
    const d = denZaznamu(z.kdy);
    if (d !== den) {
      odstavce.push({ druh: "nadpis2", text: d });
      den = d;
    }
    odstavce.push({
      druh: "text",
      text: `${casZaznamu(z.kdy)} — ${z.kdo_jmeno}: ${z.popis}`,
    });
  }
  return odstavce;
}
