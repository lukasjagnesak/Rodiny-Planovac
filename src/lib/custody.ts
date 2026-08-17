import { differenceInCalendarDays, startOfWeek } from "date-fns";
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
      if (!map || map.length !== 7) return null;
      // `weekly_map` je od pondělí; getDay() vrací 0 = neděle.
      const idx = (date.getDay() + 6) % 7;
      return map[idx] === "a" ? "a" : "b";
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

    let side: CustodySide | null;
    if (override) {
      side = override.side;
    } else {
      const pattern = pickPattern(patterns, key, childId);
      side = pattern ? sideFromPattern(pattern, date) : null;
    }

    result.push({
      key,
      date,
      side,
      isOverride: Boolean(override),
      overrideReason: override?.reason ?? null,
      isHandover: side !== null && previousSide !== null && side !== previousSide,
    });

    previousSide = side;
  }

  return result;
}

export interface CustodyStats {
  nightsA: number;
  nightsB: number;
  unassigned: number;
  total: number;
  percentA: number;
  percentB: number;
}

/**
 * Počet nocí u každé strany.
 * Noc ze dne D na D+1 patří té straně, která má dítě v den D.
 */
export function custodyStats(days: CustodyDay[]): CustodyStats {
  let nightsA = 0;
  let nightsB = 0;
  let unassigned = 0;

  for (const d of days) {
    if (d.side === "a") nightsA += 1;
    else if (d.side === "b") nightsB += 1;
    else unassigned += 1;
  }

  const assigned = nightsA + nightsB;
  return {
    nightsA,
    nightsB,
    unassigned,
    total: days.length,
    percentA: assigned ? Math.round((nightsA / assigned) * 100) : 0,
    percentB: assigned ? Math.round((nightsB / assigned) * 100) : 0,
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
  alternating_weeks: "Střídání po týdnu",
  week_2_2_3: "Schéma 2-2-3",
  custom_weekly: "Vlastní týdenní rozpis",
  fixed_parent: "Trvale u jednoho rodiče",
};

export const PATTERN_HINTS: Record<CustodyPattern["kind"], string> = {
  alternating_weeks: "Celý týden u jednoho rodiče, pak se vymění. Nejčastější varianta.",
  week_2_2_3: "Po–Út u A, St–Čt u B, Pá–Ne u A. Další týden obráceně.",
  custom_weekly: "Sám určíš, který den v týdnu patří komu. Opakuje se každý týden.",
  fixed_parent: "Bez střídání — děti jsou trvale u jednoho rodiče.",
};
