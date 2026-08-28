/**
 * Orientační výpočet výživného podle doporučující tabulky Ministerstva
 * spravedlnosti.
 *
 * Tabulka udává rozpětí procent z čistého příjmu podle životní etapy
 * dítěte. Každý rodič tak „dluží" své procento — a to, co už pokrývá tím,
 * že má dítě fyzicky u sebe, se odečte. Výživné je rozdíl mezi rodiči
 * a platí ho ten, komu vyjde víc.
 *
 * Proto při rovnoměrné střídavé péči a podobných příjmech vyjde nula.
 * Většina kalkulaček počítá jen s jedním příjmem a pro střídavku je tím
 * pádem k ničemu.
 *
 * Vědomá zjednodušení, která patří vedle výsledku a ne do poznámky pod čarou:
 *  – u více vyživovacích povinností používáme koeficient, ne samostatnou
 *    řadu z tabulky,
 *  – nepočítáme kontrolní částku (minimum, které musí platícímu zůstat),
 *  – nepracujeme s majetkem ani s potenciálním příjmem,
 *  – u nadstandardních příjmů tabulka spolehlivě nefunguje vůbec.
 */

export interface Etapa {
  id: string;
  popis: string;
  /** Dolní hranice v procentech z čistého příjmu. */
  od: number;
  /** Horní hranice v procentech. */
  do: number;
}

export const ETAPY: Etapa[] = [
  { id: "predskolni", popis: "Předškolní věk (zhruba 0–5 let)", od: 11, do: 15 },
  { id: "prvni-stupen", popis: "1. stupeň ZŠ (zhruba 6–10 let)", od: 13, do: 17 },
  { id: "druhy-stupen", popis: "2. stupeň ZŠ (zhruba 11–15 let)", od: 15, do: 19 },
  { id: "stredni", popis: "Střední škola a vyšší (16 let a víc)", od: 17, do: 23 },
];

/**
 * Koeficient pro víc vyživovacích povinností. Čím víc dětí, tím menší podíl
 * na každé z nich — celkové zatížení rodiče ale roste.
 */
export const KOEFICIENT_POVINNOSTI: Record<number, number> = {
  1: 1,
  2: 0.8,
  3: 0.68,
  4: 0.6,
};

export interface VyzivneVstup {
  /** `id` z {@link ETAPY}. */
  etapa: string;
  /** Čistý měsíční příjem rodiče A v Kč. */
  prijemA: number;
  /** Čistý měsíční příjem rodiče B v Kč. */
  prijemB: number;
  /** Podíl péče rodiče A v procentech (0–100). Při střídavce 50. */
  peceA: number;
  /** Počet vyživovacích povinností rodiče včetně tohoto dítěte (1–4). */
  povinnosti: number;
}

export const VYCHOZI_VYZIVNE: VyzivneVstup = {
  etapa: "druhy-stupen",
  prijemA: 42000,
  prijemB: 30000,
  peceA: 50,
  povinnosti: 1,
};

export interface VyzivneVysledek {
  /** `true`, když je rozdíl tak malý, že se výživné obvykle nestanoví. */
  bezVyzivneho: boolean;
  /** Kdo platí. `null`, když se výživné nestanoví. */
  platce: "a" | "b" | null;
  /** Částka měsíčně v Kč, zaokrouhlená na desetikoruny. */
  castka: number;
  /** Dolní a horní hranice podle rozpětí procent v tabulce. */
  rozpeti: { od: number; do: number };
  /** Použité procento (střed rozpětí) a hranice tabulky. */
  procenta: { od: number; do: number; stred: number };
}

/** Hranice, pod kterou už nemá smysl mluvit o výživném. */
const ZANEDBATELNE_KC = 200;

function naDesetikoruny(castka: number): number {
  return Math.round(castka / 10) * 10;
}

function omez(hodnota: number, od: number, doHodnoty: number): number {
  if (!Number.isFinite(hodnota)) return od;
  return Math.min(Math.max(hodnota, od), doHodnoty);
}

export function najdiEtapu(id: string): Etapa {
  return ETAPY.find((e) => e.id === id) ?? ETAPY[2];
}

/**
 * Kolik by rodič měl na dítě přispívat penězi.
 *
 * Podíl péče se odečítá, protože ten rodič už tu část pokrývá naturálně —
 * jídlem, bydlením, praním. Při 100% péči nedluží nic, při nulové plné procento.
 */
function povinnost(prijem: number, procenta: number, podilPece: number, koeficient: number): number {
  return prijem * (procenta / 100) * koeficient * (1 - podilPece);
}

export function spocitejVyzivne(vstup: VyzivneVstup): VyzivneVysledek {
  const etapa = najdiEtapu(vstup.etapa);
  const stred = (etapa.od + etapa.do) / 2;

  const povinnosti = omez(Math.round(vstup.povinnosti), 1, 4);
  const koeficient = KOEFICIENT_POVINNOSTI[povinnosti];

  const prijemA = Math.max(0, Number(vstup.prijemA) || 0);
  const prijemB = Math.max(0, Number(vstup.prijemB) || 0);

  const podilA = omez(vstup.peceA, 0, 100) / 100;
  const podilB = 1 - podilA;

  /** Kladné číslo znamená, že platí rodič A. */
  const rozdil = (procenta: number) =>
    povinnost(prijemA, procenta, podilA, koeficient) -
    povinnost(prijemB, procenta, podilB, koeficient);

  const stredniRozdil = rozdil(stred);
  const castka = naDesetikoruny(Math.abs(stredniRozdil));

  if (castka < ZANEDBATELNE_KC) {
    return {
      bezVyzivneho: true,
      platce: null,
      castka: 0,
      rozpeti: { od: 0, do: 0 },
      procenta: { od: etapa.od, do: etapa.do, stred },
    };
  }

  const dolni = Math.abs(rozdil(etapa.od));
  const horni = Math.abs(rozdil(etapa.do));

  return {
    bezVyzivneho: false,
    platce: stredniRozdil > 0 ? "a" : "b",
    castka,
    rozpeti: {
      od: naDesetikoruny(Math.min(dolni, horni)),
      do: naDesetikoruny(Math.max(dolni, horni)),
    },
    procenta: { od: etapa.od, do: etapa.do, stred },
  };
}
