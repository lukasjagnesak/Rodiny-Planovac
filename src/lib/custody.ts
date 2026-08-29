import { addWeeks, differenceInCalendarDays, getISOWeek, startOfWeek } from "date-fns";
import { WEEK_OPTS, toDateKey, fromDateKey } from "./dates";
import type { CustodyOverride, CustodyPattern, CustodySide } from "./types";

/** Schéma 2-2-3 rozepsané na 14 dní od pondělí. `P` = kotevní strana, `S` = druhá. */
const CYCLE_2_2_3 = "PPSSPPP" + "SSPPSSS";

export interface CustodyDay {
  /** `YYYY-MM-DD` */
  key: string;
  date: Date;
  side: CustodySide | null;
  /** Den byl ručně přepsán výjimkou. */
  isOverride: boolean;
  overrideReason: string | null;
  /** Tímto dnem začíná pobyt u dané strany (den předání). */
  isHandover: boolean;
  /**
   * U koho dítě tu noc spí.
   *
   * Uvnitř pobytu je to táž strana jako přes den. Na dni předání záleží
   * na tom, kdy se předává: odpoledne znamená, že dítě spí už
   * u přebírajícího, ráno následujícího dne že ještě u odcházejícího.
   */
  nightSide: CustodySide | null;
  /** Den předání, kdy se noc liší ode dne — kalendář ho kreslí přepůlený. */
  isNightSplit: boolean;
}

function otherSide(side: CustodySide): CustodySide {
  return side === "a" ? "b" : "a";
}

/**
 * Vybere vzor platný pro daný den a dítě.
 * Přednost má vzor přiřazený konkrétnímu dítěti, pak nejnovější `starts_on`.
 */
function pickPattern(
  patterns: CustodyPattern[],
  dayKey: string,
  childId: string | null,
): CustodyPattern | null {
  const applicable = patterns.filter((p) => {
    if (p.child_id !== null && p.child_id !== childId) return false;
    if (p.starts_on > dayKey) return false;
    if (p.ends_on && p.ends_on < dayKey) return false;
    return true;
  });

  if (applicable.length === 0) return null;

  applicable.sort((a, b) => {
    // Vzor pro konkrétní dítě přebíjí obecný vzor rodiny.
    const specificity = Number(b.child_id !== null) - Number(a.child_id !== null);
    if (specificity !== 0) return specificity;
    if (a.starts_on !== b.starts_on) return a.starts_on < b.starts_on ? 1 : -1;
    return 0;
  });

  return applicable[0];
}

/** Určí stranu podle vzoru — bez zohlednění výjimek. */
export function sideFromPattern(pattern: CustodyPattern, date: Date): CustodySide | null {
  const anchor = fromDateKey(pattern.anchor_date);

  switch (pattern.kind) {
    case "fixed_parent":
      return pattern.fixed_side ?? pattern.anchor_side;

    case "custom_weekly": {
      const map = pattern.weekly_map;
      if (!map) return null;

      // Sedm znaků = rozpis se opakuje každý týden.
      if (map.length === 7) {
        // `weekly_map` je od pondělí; getDay() vrací 0 = neděle.
        const idx = (date.getDay() + 6) % 7;
        return map[idx] === "a" ? "a" : "b";
      }

      // Čtrnáct znaků = dvoutýdenní cyklus. Který týden je v cyklu první,
      // určuje týden, do kterého padá `anchor_date`.
      if (map.length === 14) {
        const anchorWeekStart = startOfWeek(anchor, WEEK_OPTS);
        const diff = differenceInCalendarDays(date, anchorWeekStart);
        const idx = ((diff % 14) + 14) % 14;
        return map[idx] === "a" ? "a" : "b";
      }

      return null;
    }

    case "iso_week_parity": {
      // `anchor_side` je strana, která má SUDÝ týden. Číslo týdne je podle
      // ISO 8601 — týden začíná pondělím, stejně jako školní rozvrhy.
      const even = getISOWeek(date) % 2 === 0;
      return even ? pattern.anchor_side : otherSide(pattern.anchor_side);
    }

    case "week_2_2_3": {
      const anchorWeekStart = startOfWeek(anchor, WEEK_OPTS);
      const diff = differenceInCalendarDays(date, anchorWeekStart);
      const idx = ((diff % 14) + 14) % 14;
      return CYCLE_2_2_3[idx] === "P" ? pattern.anchor_side : otherSide(pattern.anchor_side);
    }

    case "alternating_weeks":
    default: {
      const anchorWeekStart = startOfWeek(anchor, WEEK_OPTS);
      const dayWeekStart = startOfWeek(date, WEEK_OPTS);
      const weeks = Math.round(differenceInCalendarDays(dayWeekStart, anchorWeekStart) / 7);
      const even = ((weeks % 2) + 2) % 2 === 0;
      return even ? pattern.anchor_side : otherSide(pattern.anchor_side);
    }
  }
}

export interface ResolveArgs {
  days: Date[];
  patterns: CustodyPattern[];
  overrides: CustodyOverride[];
  /** `null` = pohled na celou rodinu (použijí se obecné vzory). */
  childId: string | null;
}

/**
 * Hlavní funkce: pro každý den vrátí, u koho děti jsou.
 * Výjimky mají přednost před vzorem; výjimka pro konkrétní dítě
 * přebíjí výjimku pro celou rodinu.
 */
export function resolveCustody({ days, patterns, overrides, childId }: ResolveArgs): CustodyDay[] {
  const overrideMap = new Map<string, CustodyOverride>();
  for (const o of overrides) {
    if (o.child_id !== null && o.child_id !== childId) continue;
    const existing = overrideMap.get(o.day);
    // Výjimka pro konkrétní dítě má přednost před obecnou.
    if (!existing || (existing.child_id === null && o.child_id !== null)) {
      overrideMap.set(o.day, o);
    }
  }

  const result: CustodyDay[] = [];
  let previousSide: CustodySide | null = null;

  for (const date of days) {
    const key = toDateKey(date);
    const override = overrideMap.get(key);

    // Výjimka může měnit jen noc — pak `side` zůstane na vzoru.
    const pattern = pickPattern(patterns, key, childId);
    const zeVzoru = pattern ? sideFromPattern(pattern, date) : null;
    const side: CustodySide | null = override?.side ?? zeVzoru;

    result.push({
      key,
      date,
      side,
      isOverride: Boolean(override),
      overrideReason: override?.reason ?? null,
      isHandover: side !== null && previousSide !== null && side !== previousSide,
      // Doplní se v druhém průchodu — potřebuje znát následující den.
      nightSide: side,
      isNightSplit: false,
    });

    previousSide = side;
  }

  // ── Noci ────────────────────────────────────────────────────────
  //
  // Až teď, protože noc na dni předání se řídí tím, kdo má den další.
  for (let i = 0; i < result.length; i += 1) {
    const dnesni = result[i];
    const zitrejsi = result[i + 1];

    if (dnesni.side === null) {
      dnesni.nightSide = null;
      continue;
    }

    // Poslední den v rozsahu nemá s čím porovnávat — bereme ho jako
    // pokračování pobytu, ne jako předání.
    if (!zitrejsi || zitrejsi.side === null || zitrejsi.side === dnesni.side) {
      dnesni.nightSide = dnesni.side;
      continue;
    }

    const override = overrideMap.get(dnesni.key);
    const pattern = pickPattern(patterns, dnesni.key, childId);
    // Ruční výjimka na den má přednost před pravidlem ze vzoru.
    dnesni.nightSide =
      override?.nocni_strana ??
      (pattern?.predavka_vecer === false ? dnesni.side : zitrejsi.side);
    dnesni.isNightSplit = dnesni.nightSide !== dnesni.side;
  }

  return result;
}

export interface CustodyStats {
  /** Zaškrtnuté dny — to, co se v kalendáři klika. */
  daysA: number;
  daysB: number;
  /** Noci. U střídavé péče je to číslo, na které se ptá soud i úřad. */
  nightsA: number;
  nightsB: number;
  /** Nocí, které šlo přiřadit (o jednu míň než dnů — poslední nemá druhý konec). */
  nightsTotal: number;
  unassigned: number;
  total: number;
  /** Podíl podle nocí, ne podle dnů. */
  percentA: number;
  percentB: number;
}

/**
 * Dny a noci u každé strany.
 *
 * V kalendáři se zaškrtává, **který den** je dítě u koho. Noc je něco
 * jiného: patří tomu, u koho dítě ten večer usíná. Když se v neděli večer
 * předává, nedělní noc už patří přebírajícímu rodiči — proto pobyt od
 * čtvrtka do neděle znamená čtyři dny, ale tři noci.
 *
 * Prakticky tedy noc po dni D patří tomu, kdo má den D+1. Uvnitř pobytu je
 * to stejná strana a na jeho konci se to samo překlopí na druhou.
 *
 * Rozdíl není kosmetický: u střídavé péče se počítají noci a den navíc
 * v součtu posune poměr, ze kterého se odvíjí výživné.
 */
export function custodyStats(days: CustodyDay[]): CustodyStats {
  let daysA = 0;
  let daysB = 0;
  let unassigned = 0;

  for (const d of days) {
    if (d.side === "a") daysA += 1;
    else if (d.side === "b") daysB += 1;
    else unassigned += 1;
  }

  // Noc má každý den právě jednu a `resolveCustody` už ví, komu patří —
  // uvnitř pobytu témuž rodiči jako den, na dni předání podle toho, kdy
  // se předává. Součet nocí proto vždycky sedí na počet přiřazených dnů
  // a nikdy nevyjde víc nocí než dnů.
  let nightsA = 0;
  let nightsB = 0;
  for (const d of days) {
    if (d.nightSide === "a") nightsA += 1;
    else if (d.nightSide === "b") nightsB += 1;
  }

  const prirazenychNoci = nightsA + nightsB;
  // Druhé procento se dopočítá z prvního. Kdyby se zaokrouhlovala obě
  // zvlášť, vyjde u lichých poměrů součet 99 nebo 101 a v přehledu to
  // vypadá jako chyba výpočtu.
  const percentA = prirazenychNoci ? Math.round((nightsA / prirazenychNoci) * 100) : 0;

  return {
    daysA,
    daysB,
    nightsA,
    nightsB,
    nightsTotal: nightsA + nightsB,
    unassigned,
    total: days.length,
    percentA,
    percentB: prirazenychNoci ? 100 - percentA : 0,
  };
}

/** Souvislé bloky pobytu — pro popisky typu „Po 3. 3. – Ne 9. 3. u mámy“. */
export interface CustodyBlock {
  side: CustodySide;
  startKey: string;
  endKey: string;
  nights: number;
}

export function custodyBlocks(days: CustodyDay[]): CustodyBlock[] {
  const blocks: CustodyBlock[] = [];
  for (const day of days) {
    if (day.side === null) continue;
    const last = blocks[blocks.length - 1];
    if (last && last.side === day.side && isNextDay(last.endKey, day.key)) {
      last.endKey = day.key;
      last.nights += 1;
    } else {
      blocks.push({ side: day.side, startKey: day.key, endKey: day.key, nights: 1 });
    }
  }
  return blocks;
}

function isNextDay(prevKey: string, nextKey: string): boolean {
  return differenceInCalendarDays(fromDateKey(nextKey), fromDateKey(prevKey)) === 1;
}

export const PATTERN_LABELS: Record<CustodyPattern["kind"], string> = {
  iso_week_parity: "Sudý a lichý týden",
  alternating_weeks: "Střídání po týdnu",
  week_2_2_3: "Schéma 2-2-3",
  custom_weekly: "Vlastní rozpis dnů",
  fixed_parent: "Trvale u jednoho rodiče",
};

export const PATTERN_HINTS: Record<CustodyPattern["kind"], string> = {
  iso_week_parity:
    "Podle čísla kalendářního týdne — sudý u jednoho rodiče, lichý u druhého. Tak to bývá v rozsudcích i školních rozvrzích.",
  alternating_weeks:
    "Celý týden u jednoho rodiče, pak se vymění. Cyklus se počítá od data, které zvolíš.",
  week_2_2_3: "Po–Út u A, St–Čt u B, Pá–Ne u A. Další týden obráceně.",
  custom_weekly:
    "Sám určíš, který den patří komu. Cyklus může být jednotýdenní, nebo dvoutýdenní — když se sudý a lichý týden liší.",
  fixed_parent: "Bez střídání — děti jsou trvale u jednoho rodiče.",
};

/** Číslo a parita právě probíhajícího týdne — pomáhá při nastavování vzoru. */
export function currentWeekInfo(date = new Date()): { week: number; even: boolean } {
  const week = getISOWeek(date);
  return { week, even: week % 2 === 0 };
}

/**
 * Roky s 53 týdny způsobí, že na přelomu roku naváže lichý týden na lichý
 * (nebo sudý na sudý) a jeden rodič má děti dva týdny v kuse. U vzoru
 * „sudý/lichý týden“ se tomu nedá vyhnout jinak než ruční výjimkou, takže
 * na to aspoň včas upozorníme.
 */
export function findDoubleWeeks(from = new Date(), monthsAhead = 24): string[] {
  const start = startOfWeek(from, WEEK_OPTS);
  const weeks = Math.ceil((monthsAhead / 12) * 53);
  const hits: string[] = [];

  for (let i = 1; i <= weeks; i += 1) {
    const monday = addWeeks(start, i);
    const previous = addWeeks(start, i - 1);
    if (getISOWeek(monday) % 2 === getISOWeek(previous) % 2) {
      hits.push(toDateKey(monday));
    }
  }

  return hits;
}
