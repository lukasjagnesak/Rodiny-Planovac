import { toDateKey } from "./dates";
import type { Activity, ActivityOccurrence } from "./types";

/** Konkrétní termín kroužku v daný den — vzniká složením vzoru a případné výjimky. */
export interface ActivityInstance {
  key: string;
  day: string;
  activity: Activity;
  startsAt: string;
  endsAt: string;
  cancelled: boolean;
  driverThere: string | null;
  driverBack: string | null;
  note: string | null;
  /** ID řádku v `activity_occurrences`, pokud už existuje. */
  occurrenceId: string | null;
}

function inSeason(activity: Activity, dayKey: string): boolean {
  if (activity.season_start > dayKey) return false;
  if (activity.season_end && activity.season_end < dayKey) return false;
  return true;
}

/**
 * Rozvine opakující se kroužky do konkrétních dnů a přiloží uložené výjimky
 * (jiný čas, zrušeno, přiřazený řidič).
 */
export function expandActivities(
  days: Date[],
  activities: Activity[],
  occurrences: ActivityOccurrence[],
): Map<string, ActivityInstance[]> {
  const byActivityDay = new Map<string, ActivityOccurrence>();
  for (const o of occurrences) {
    byActivityDay.set(`${o.activity_id}:${o.day}`, o);
  }

  const result = new Map<string, ActivityInstance[]>();

  for (const date of days) {
    const dayKey = toDateKey(date);
    const dow = date.getDay();
    const list: ActivityInstance[] = [];

    for (const activity of activities) {
      if (!activity.active) continue;
      if (activity.day_of_week !== dow) continue;
      if (!inSeason(activity, dayKey)) continue;

      const occ = byActivityDay.get(`${activity.id}:${dayKey}`);
      list.push({
        key: `${activity.id}:${dayKey}`,
        day: dayKey,
        activity,
        startsAt: occ?.starts_at ?? activity.starts_at,
        endsAt: occ?.ends_at ?? activity.ends_at,
        cancelled: occ?.cancelled ?? false,
        driverThere: occ?.driver_there ?? null,
        driverBack: occ?.driver_back ?? null,
        note: occ?.note ?? null,
        occurrenceId: occ?.id ?? null,
      });
    }

    list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    if (list.length > 0) result.set(dayKey, list);
  }

  return result;
}

/** Cena kroužku přepočtená na měsíc — pro odhad nákladů na přehledu. */
export function monthlyCost(activity: Activity): number {
  const price = Number(activity.price ?? 0);
  if (!price) return 0;
  switch (activity.price_period) {
    case "month":
      return price;
    case "lesson":
      return price * 4.3;
    case "season":
    default:
      return price / 5; // pololetí ≈ 5 měsíců
  }
}
