import "server-only";

import { eachDayOfInterval } from "date-fns";
import type { createClient } from "./supabase/server";
import { expandActivities } from "./activities";
import { slozSouhrn, type Souhrn } from "./souhrn";
import { toDateKey } from "./dates";
import type {
  Activity,
  ActivityOccurrence,
  CustodyOverride,
  CustodyPattern,
  Expense,
  SessionContext,
} from "./types";

/**
 * Načte data a složí souhrn péče a nákladů za období.
 *
 * Jedno místo pro stránku souhrnu i pro registraci ověřitelného výpisu:
 * čísla, která se uloží k ověřovacímu kódu, musí spočítat server stejně
 * jako ta, která člověk vidí a tiskne.
 */
export async function nactiSouhrn(
  supabase: Awaited<ReturnType<typeof createClient>>,
  session: SessionContext,
  od: Date,
  doData: Date,
): Promise<Souhrn> {
  const odKlic = toDateKey(od);
  const doKlic = toDateKey(doData);

  const [patterns, overrides, vydaje, aktivity, terminy] = await Promise.all([
    supabase.from("custody_patterns").select("*").eq("family_id", session.family.id),
    supabase
      .from("custody_overrides")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("day", odKlic)
      .lte("day", doKlic),
    supabase
      .from("expenses")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("spent_on", odKlic)
      .lte("spent_on", doKlic)
      .order("spent_on"),
    supabase.from("activities").select("*").eq("family_id", session.family.id),
    supabase
      .from("activity_occurrences")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("day", odKlic)
      .lte("day", doKlic),
  ]);

  // Jízdy se skládají ze vzoru kroužku a zapsaných výjimek — v tabulce
  // termínů leží jen ty dny, u kterých někdo něco změnil.
  const dny = eachDayOfInterval({ start: od, end: doData });
  const jizdy = [
    ...expandActivities(
      dny,
      (aktivity.data ?? []) as Activity[],
      (terminy.data ?? []) as ActivityOccurrence[],
    ).values(),
  ].flat();

  return slozSouhrn({
    od,
    do: doData,
    deti: session.children,
    members: session.members,
    patterns: (patterns.data ?? []) as CustodyPattern[],
    overrides: (overrides.data ?? []) as CustodyOverride[],
    vydaje: (vydaje.data ?? []) as Expense[],
    jizdy,
  });

}
