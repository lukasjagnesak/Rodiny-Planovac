/**
 * Ceník. Bez `server-only` — čísla potřebuje i web a stránka předplatného.
 *
 * Platí rodina, ne uživatel. Druhý rodič, prarodiče i chůva mají přístup
 * v ceně; kdyby se platilo za hlavu, druhý rodič se nikdy nepřipojí
 * a aplikace ztrácí smysl.
 */

export type Tarif = "mesicni" | "rocni";

export interface Cenik {
  id: Tarif;
  nazev: string;
  /** Cena v korunách za celé období. */
  cena: number;
  /** Kolik to dělá měsíčně — kvůli srovnání. */
  mesicne: number;
  obdobi: string;
  popis: string;
  /** Kolik procent ušetří proti měsíčnímu. `0` = neukazovat. */
  usetri: number;
}

export const ZKUSEBNI_DNI = 30;

export const CENIK: Cenik[] = [
  {
    id: "mesicni",
    nazev: "Měsíčně",
    cena: 199,
    mesicne: 199,
    obdobi: "měsíc",
    popis: "Zrušíš kdykoli, hned v aplikaci.",
    usetri: 0,
  },
  {
    id: "rocni",
    nazev: "Ročně",
    cena: 1990,
    mesicne: 166,
    obdobi: "rok",
    popis: "Dva měsíce zdarma proti měsíční platbě.",
    usetri: 17,
  },
];

export function tarifPodleId(id: string | null | undefined): Cenik | null {
  return CENIK.find((t) => t.id === id) ?? null;
}

/** „1 990 Kč" — pevná mezera, aby se číslo nezlomilo na konci řádku. */
export function korun(castka: number): string {
  return `${castka.toLocaleString("cs-CZ").replace(/ /g, " ")} Kč`;
}
