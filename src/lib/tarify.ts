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

/**
 * Co zkušební období obsahuje.
 *
 * Odpověď je „všechno" a je to schválně: okleštěná verze zdarma znamená,
 * že rodič měsíc zkouší něco jiného, než si pak koupí. Kartu po nikom
 * nechceme — účet bez karty se nedá omylem strhnout a je to ten nejmenší
 * závazek, jaký umíme nabídnout člověku, který zrovna řeší rozvod.
 */
export const ZKUSEBNI_SLIB = {
  dni: ZKUSEBNI_DNI,
  vetaKratka: `${ZKUSEBNI_DNI} dní zdarma, všechny funkce. Bez karty.`,
  body: [
    "Všechny funkce, žádná omezená verze.",
    "Bez zadání karty — nic se samo nestrhne.",
    "Druhý rodič se může připojit hned a taky nic neplatí.",
    "Po 30 dnech se nic nesmaže: kalendář, výdaje i doklady zůstanou čitelné, zamkne se jen zapisování.",
  ],
} as const;

/** Co je v ceně. Jeden seznam pro web i pro stránku předplatného. */
export const CO_JE_V_CENE = [
  {
    nazev: "Kalendář střídavé péče",
    popis: "Vzory střídání, výjimky, prázdniny a noci předání — s počtem nocí u každého rodiče.",
  },
  {
    nazev: "Celá rodina v ceně",
    popis: "Druhý rodič, prarodiče i chůva. Platí jedna domácnost, ne každý účet zvlášť.",
  },
  {
    nazev: "Výdaje a účtenky",
    popis: "Kdo co zaplatil, jak se to dělí a kolik z toho plyne vyrovnání. Účtenku stačí vyfotit.",
  },
  {
    nazev: "Kroužky a odvozy",
    popis: "Kdo veze tam a kdo zpátky, u každého termínu jménem. Cenu lze rozdělit mezi rodiče.",
  },
  {
    nazev: "Škola",
    popis: "Rozvrh každého dítěte, úkoly a zprávy z EduPage, které se samy stahují.",
  },
  {
    nazev: "Připomínky",
    popis: "Den předem přijde, co se chystá — do Telegramu i do Google kalendáře.",
  },
] as const;

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
