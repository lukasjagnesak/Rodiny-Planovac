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

export interface DiteVstup {
  /** `id` z {@link ETAPY}. */
  etapa: string;
}

export interface VyzivneVstup {
  /** Společné děti obou rodičů. Každé má vlastní etapu — procenta z tabulky se liší. */
  deti: DiteVstup[];
  /** Čistý měsíční příjem rodiče A v Kč. */
  prijemA: number;
  /** Čistý měsíční příjem rodiče B v Kč. */
  prijemB: number;
  /**
   * Podíl péče rodiče A v procentech (0–100). Při střídavce 50.
   * Platí pro všechny společné děti — jiný režim u sourozenců je vzácný
   * a tabulka na něj stejně nemá odpověď.
   */
  peceA: number;
  /** Další vyživované děti rodiče A mimo tento vztah. */
  dalsiDetiA: number;
  /** Další vyživované děti rodiče B mimo tento vztah. */
  dalsiDetiB: number;
}

export const VYCHOZI_VYZIVNE: VyzivneVstup = {
  deti: [{ etapa: "druhy-stupen" }],
  prijemA: 42000,
  prijemB: 30000,
  peceA: 50,
  dalsiDetiA: 0,
  dalsiDetiB: 0,
};

/** Nejvíc společných dětí, se kterými kalkulačka počítá. */
export const MAX_DETI = 6;

/** Nejvíc dalších dětí na rodiče. Nad čtyři povinnosti tabulka nejde. */
export const MAX_DALSICH_DETI = 3;

export interface PodilDitete {
  etapa: Etapa;
  /** Kolik z celkové částky připadá na tohle dítě. */
  castka: number;
}

export interface VyzivneVysledek {
  /** `true`, když je rozdíl tak malý, že se výživné obvykle nestanoví. */
  bezVyzivneho: boolean;
  /** Kdo platí. `null`, když se výživné nestanoví. */
  platce: "a" | "b" | null;
  /** Částka měsíčně v Kč za všechny děti dohromady, zaokrouhlená na desetikoruny. */
  castka: number;
  /** Dolní a horní hranice podle rozpětí procent v tabulce. */
  rozpeti: { od: number; do: number };
  /** Rozpad po dětech, aby bylo vidět, odkud se částka bere. */
  podleDeti: PodilDitete[];
  /** Kolik vyživovacích povinností se u kterého rodiče počítalo. */
  povinnostiA: number;
  povinnostiB: number;
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
  const deti = (vstup.deti?.length ? vstup.deti : VYCHOZI_VYZIVNE.deti).slice(0, MAX_DETI);
  const etapy = deti.map((d) => najdiEtapu(d.etapa));

  /**
   * Koeficient se řídí **celkovým** počtem vyživovacích povinností rodiče,
   * tedy i dětmi z jiného vztahu. Každý rodič jich může mít jiný počet —
   * proto se počítá zvlášť pro každého.
   */
  const povinnostiA = omez(
    deti.length + Math.round(vstup.dalsiDetiA || 0),
    1,
    4,
  );
  const povinnostiB = omez(
    deti.length + Math.round(vstup.dalsiDetiB || 0),
    1,
    4,
  );
  const koefA = KOEFICIENT_POVINNOSTI[povinnostiA];
  const koefB = KOEFICIENT_POVINNOSTI[povinnostiB];

  const prijemA = Math.max(0, Number(vstup.prijemA) || 0);
  const prijemB = Math.max(0, Number(vstup.prijemB) || 0);

  const podilA = omez(vstup.peceA, 0, 100) / 100;
  const podilB = 1 - podilA;

  /** Kladné číslo znamená, že na tohle dítě platí rodič A. */
  const rozdilDitete = (etapa: Etapa, procenta: number) =>
    povinnost(prijemA, procenta, podilA, koefA) - povinnost(prijemB, procenta, podilB, koefB);

  const soucet = (vyber: (e: Etapa) => number) =>
    etapy.reduce((s, e) => s + rozdilDitete(e, vyber(e)), 0);

  const stred = (e: Etapa) => (e.od + e.do) / 2;
  const stredniRozdil = soucet(stred);
  const castka = naDesetikoruny(Math.abs(stredniRozdil));

  const prazdneRozpeti = { od: 0, do: 0 };

  if (castka < ZANEDBATELNE_KC) {
    return {
      bezVyzivneho: true,
      platce: null,
      castka: 0,
      rozpeti: prazdneRozpeti,
      podleDeti: etapy.map((etapa) => ({ etapa, castka: 0 })),
      povinnostiA,
      povinnostiB,
    };
  }

  const dolni = Math.abs(soucet((e) => e.od));
  const horni = Math.abs(soucet((e) => e.do));

  return {
    bezVyzivneho: false,
    platce: stredniRozdil > 0 ? "a" : "b",
    castka,
    rozpeti: {
      od: naDesetikoruny(Math.min(dolni, horni)),
      do: naDesetikoruny(Math.max(dolni, horni)),
    },
    podleDeti: etapy.map((etapa) => ({
      etapa,
      castka: naDesetikoruny(Math.abs(rozdilDitete(etapa, stred(etapa)))),
    })),
    povinnostiA,
    povinnostiB,
  };
}
