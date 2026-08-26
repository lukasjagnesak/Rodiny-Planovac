import type { Metadata } from "next";
import { addDays, endOfMonth, startOfMonth, startOfYear } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { toDateKey } from "@/lib/dates";
import { Dashboard } from "@/components/dashboard/dashboard";
import type {
  Activity,
  ActivityOccurrence,
  CustodyOverride,
  CustodyPattern,
  Expense,
  FamilyEvent,
  RozvrhHodina,
  RozvrhZmena,
} from "@/lib/types";

export const metadata: Metadata = { title: "Přehled" };

export default async function DashboardPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const today = new Date();
  const monthStart = toDateKey(startOfMonth(today));
  const monthEnd = toDateKey(endOfMonth(today));
  const yearStart = toDateKey(startOfYear(today));
  const soon = toDateKey(addDays(today, 14));

  const [
    patterns,
    overrides,
    activities,
    occurrences,
    events,
    expenses,
    rozvrh,
    rozvrhZmeny,
  ] = await Promise.all([
    supabase
      .from("custody_patterns")
      .select("*")
      .eq("family_id", session.family.id),
    supabase
      .from("custody_overrides")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("day", yearStart),
    supabase
      .from("activities")
      .select("*")
      .eq("family_id", session.family.id)
      .eq("active", true),
    supabase
      .from("activity_occurrences")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("day", toDateKey(today))
      .lte("day", soon),
    supabase
      .from("events")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("starts_at", toDateKey(addDays(today, -1)))
      .order("starts_at")
      .limit(20),
    supabase
      .from("expenses")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("spent_on", monthStart)
      .lte("spent_on", monthEnd),
    supabase
      .from("rozvrh_hodiny")
      .select("*")
      .eq("family_id", session.family.id)
      .order("poradi"),
    supabase
      .from("rozvrh_zmeny")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("den", toDateKey(today)),
  ]);

  return (
    <Dashboard
      session={session}
      patterns={(patterns.data ?? []) as CustodyPattern[]}
      overrides={(overrides.data ?? []) as CustodyOverride[]}
      activities={(activities.data ?? []) as Activity[]}
      occurrences={(occurrences.data ?? []) as ActivityOccurrence[]}
      events={(events.data ?? []) as FamilyEvent[]}
      expenses={(expenses.data ?? []) as Expense[]}
      rozvrh={(rozvrh.data ?? []) as RozvrhHodina[]}
      rozvrhZmeny={(rozvrhZmeny.data ?? []) as RozvrhZmena[]}
    />
  );
}
