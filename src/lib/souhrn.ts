/**
 * Souhrn péče a nákladů za období.
 *
 * Dokument, který si rodina vygeneruje sama a dá ho, komu chce —
 * advokátovi, mediátorovi, k soudu. Klidoo nikam nic neposílá; kdo ho
 * dostane, rozhoduje ta rodina.
 *
 * Tenhle soubor jen počítá. Vykreslení je vedle, aby čísla, o která
 * se někdo bude opírat před soudem, šla ověřit testem a ne prohlídkou
 * stránky.
 *
 * Dvě zásady, které se táhnou celým výpočtem:
 *
 * Počítají se NOCI, ne dny. Na noci se ptá soud i úřad při posuzování
 * rozsahu péče a den předání patří půl na půl — kdo počítá zaškrtnuté
 * dny, dojde k jinému číslu než protistrana a je z toho spor.
 *
 * Nic se nedopočítává a nic se neodhaduje. Když se v období nevozilo,
 * je u dopravy nula, ne prázdné místo. Dokument, který mlčí, se před
 * soudem čte hůř než dokument, který přizná, že údaj chybí.
 */

import { custodyStatsForRange } from "./custody";
import { EXPENSE_CATEGORIES } from "./constants";
import type {
  Activity,
  ActivityOccurrence,
  Child,
  CustodyOverride,
  CustodyPattern,
  Expense,
  ExpenseCategory,
  MemberView,
} from "./types";
import type { ActivityInstance } from "./activities";

export interface NociSouhrn {
  a: number;
  b: number;
  celkem: number;
  procentA: number;
  procentB: number;
  /** Noci, které se nepodařilo přiřadit — chybí vzor střídání. */
  neprirazeno: number;
}

export interface VydajKategorie {
  kategorie: ExpenseCategory;
  nazev: string;
  castka: number;
  pocet: number;
}

export interface VydajePodleRodice {
  memberId: string;
  jmeno: string;
  zaplatil: number;
  pocet: number;
}

export interface DopravaRodice {
  memberId: string;
  jmeno: string;
  tam: number;
  zpet: number;
  celkem: number;
}

export interface SouhrnDitete {
  dite: Child;
  noci: NociSouhrn;
  vydaje: number;
}

export interface Souhrn {
  od: string;
  do: string;
  /** Souhrn za všechny děti dohromady. */
  noci: NociSouhrn;
  deti: SouhrnDitete[];
  vydajeCelkem: number;
  podleKategorii: VydajKategorie[];
  podleRodice: VydajePodleRodice[];
  /** Kolik zbývá dorovnat mezi rodiči z nevypořádaných výdajů. */
  nevyrovnano: { memberId: string; jmeno: string; castka: number } | null;
  doprava: DopravaRodice[];
  dopravaCelkem: number;
  /** Kolik jízd nemá zapsaného řidiče — ať je vidět, jak úplné to je. */
  dopravaBezRidice: number;
}

function prazdneNoci(): NociSouhrn {
  return { a: 0, b: 0, celkem: 0, procentA: 0, procentB: 0, neprirazeno: 0 };
}

function jmenoClena(members: MemberView[], id: string | null): string {
  if (!id) return "nezapsáno";
  return members.find((m) => m.id === id || m.userId === id)?.name ?? "bývalý člen";
}

/**
 * Sečte noci za období.
 *
 * `childId: null` znamená celou rodinu — takový vzor střídání platí pro
 * všechny děti, což je nejčastější případ.
 */
export function nociZaObdobi(args: {
  od: Date;
  do: Date;
  patterns: CustodyPattern[];
  overrides: CustodyOverride[];
  childId: string | null;
}): NociSouhrn {
  const s = custodyStatsForRange({
    start: args.od,
    end: args.do,
    patterns: args.patterns,
    overrides: args.overrides,
    childId: args.childId,
  });

  return {
    a: s.nightsA,
    b: s.nightsB,
    celkem: s.nightsTotal,
    procentA: s.percentA,
    procentB: s.percentB,
    neprirazeno: s.unassigned,
  };
}

/** Výdaje rozpadlé podle kategorie, sestupně podle částky. */
export function vydajePodleKategorii(vydaje: Expense[]): VydajKategorie[] {
  const podle = new Map<ExpenseCategory, { castka: number; pocet: number }>();

  for (const v of vydaje) {
    const stav = podle.get(v.category) ?? { castka: 0, pocet: 0 };
    stav.castka += Number(v.amount);
    stav.pocet += 1;
    podle.set(v.category, stav);
  }

  return [...podle.entries()]
    .map(([kategorie, stav]) => ({
      kategorie,
      nazev: EXPENSE_CATEGORIES[kategorie]?.label ?? String(kategorie),
      castka: stav.castka,
      pocet: stav.pocet,
    }))
    .sort((a, b) => b.castka - a.castka);
}

/** Kdo kolik doopravdy zaplatil — bez ohledu na to, jak se to dělí. */
export function vydajePodleRodice(
  vydaje: Expense[],
  members: MemberView[],
): VydajePodleRodice[] {
  const podle = new Map<string, { castka: number; pocet: number }>();

  for (const v of vydaje) {
    const klic = v.paid_by ?? "";
    const stav = podle.get(klic) ?? { castka: 0, pocet: 0 };
    stav.castka += Number(v.amount);
    stav.pocet += 1;
    podle.set(klic, stav);
  }

  return [...podle.entries()]
    .map(([memberId, stav]) => ({
      memberId,
      jmeno: jmenoClena(members, memberId || null),
      zaplatil: stav.castka,
      pocet: stav.pocet,
    }))
    .sort((a, b) => b.zaplatil - a.zaplatil);
}

/**
 * Kolik zbývá dorovnat.
 *
 * Počítá se jen z nevypořádaných výdajů — vypořádané už si rodiče mezi
 * sebou srovnali a započítat je znovu by znamenalo vyrobit dluh, který
 * neexistuje.
 *
 * `split_percent` je podíl, který nese DRUHÝ rodič než ten, kdo platil.
 * Vrací se pohledem toho, komu se dluží; `null`, když je to vyrovnané
 * nebo v rodině nejsou právě dva rodiče, mezi kterými by šlo dorovnávat.
 */
export function nevyrovnano(
  vydaje: Expense[],
  members: MemberView[],
): { memberId: string; jmeno: string; castka: number } | null {
  const rodice = members.filter((m) => m.role === "owner" || m.role === "parent");
  if (rodice.length !== 2) return null;

  const [prvni, druhy] = rodice;
  let zustatek = 0; // kladné = druhý dluží prvnímu

  for (const v of vydaje) {
    if (v.settled) continue;
    const podil = (Number(v.amount) * Number(v.split_percent)) / 100;
    if (v.paid_by === prvni.id || v.paid_by === prvni.userId) zustatek += podil;
    else if (v.paid_by === druhy.id || v.paid_by === druhy.userId) zustatek -= podil;
  }

  const castka = Math.round(Math.abs(zustatek) * 100) / 100;
  if (castka < 0.5) return null;

  const komu = zustatek > 0 ? prvni : druhy;
  return { memberId: komu.id, jmeno: komu.name, castka };
}

/**
 * Kdo kolikrát vezl.
 *
 * Zrušené termíny se nepočítají — nikdo na ně nejel. Cesta tam a zpátky
 * jsou dvě jízdy, protože to bývají dva různí lidé a často i dva různé
 * dny v týdnu.
 */
export function dopravaPodleRodice(
  instance: ActivityInstance[],
  members: MemberView[],
): { rodice: DopravaRodice[]; celkem: number; bezRidice: number } {
  const podle = new Map<string, { tam: number; zpet: number }>();
  let celkem = 0;
  let bezRidice = 0;

  for (const i of instance) {
    if (i.cancelled) continue;

    for (const [kdo, smer] of [
      [i.driverThere, "tam"],
      [i.driverBack, "zpet"],
    ] as const) {
      celkem += 1;
      if (!kdo) {
        bezRidice += 1;
        continue;
      }
      const stav = podle.get(kdo) ?? { tam: 0, zpet: 0 };
      stav[smer] += 1;
      podle.set(kdo, stav);
    }
  }

  const rodice = [...podle.entries()]
    .map(([memberId, stav]) => ({
      memberId,
      jmeno: jmenoClena(members, memberId),
      tam: stav.tam,
      zpet: stav.zpet,
      celkem: stav.tam + stav.zpet,
    }))
    .sort((a, b) => b.celkem - a.celkem);

  return { rodice, celkem, bezRidice };
}

/** Poskládá celý souhrn. */
export function slozSouhrn(vstup: {
  od: Date;
  do: Date;
  deti: Child[];
  members: MemberView[];
  patterns: CustodyPattern[];
  overrides: CustodyOverride[];
  vydaje: Expense[];
  jizdy: ActivityInstance[];
}): Souhrn {
  const odKlic = vstup.od.toISOString().slice(0, 10);
  const doKlic = vstup.do.toISOString().slice(0, 10);

  const deti: SouhrnDitete[] = vstup.deti.map((dite) => ({
    dite,
    noci: nociZaObdobi({
      od: vstup.od,
      do: vstup.do,
      patterns: vstup.patterns,
      overrides: vstup.overrides,
      childId: dite.id,
    }),
    vydaje: vstup.vydaje
      .filter((v) => v.child_id === dite.id)
      .reduce((s, v) => s + Number(v.amount), 0),
  }));

  const doprava = dopravaPodleRodice(vstup.jizdy, vstup.members);

  return {
    od: odKlic,
    do: doKlic,
    // Souhrn za rodinu se počítá ze vzoru bez dítěte. U rodin, kde má
    // každé dítě vlastní rozpis, je pravdivý údaj až ten po dětech —
    // proto se ukazuje obojí.
    noci:
      vstup.deti.length > 0
        ? nociZaObdobi({
            od: vstup.od,
            do: vstup.do,
            patterns: vstup.patterns,
            overrides: vstup.overrides,
            childId: null,
          })
        : prazdneNoci(),
    deti,
    vydajeCelkem: vstup.vydaje.reduce((s, v) => s + Number(v.amount), 0),
    podleKategorii: vydajePodleKategorii(vstup.vydaje),
    podleRodice: vydajePodleRodice(vstup.vydaje, vstup.members),
    nevyrovnano: nevyrovnano(vstup.vydaje, vstup.members),
    doprava: doprava.rodice,
    dopravaCelkem: doprava.celkem,
    dopravaBezRidice: doprava.bezRidice,
  };
}
