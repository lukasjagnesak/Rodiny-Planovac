import type { Metadata } from "next";
import { addDays, endOfWeek, startOfMonth, startOfWeek, endOfMonth, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { WEEK_OPTS, toDateKey } from "@/lib/dates";
import { MonthView } from "@/components/calendar/month-view";
import type {
  Activity,
  ActivityOccurrence,
  CustodyOverride,
  CustodyPattern,
  FamilyEvent,
} from "@/lib/types";

export const metadata: Metadata = { title: "Kalendář" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; dite?: string }>;
}) {
  const { m, dite } = await searchParams;
  const session = await requireSession();
  const supabase = await createClient();

  const anchor = m && /^\d{4}-\d{2}$/.test(m) ? parseISO(`${m}-01T00:00:00`) : new Date();

  // Mřížka přesahuje do sousedních měsíců — data načítáme na celý rozsah.
  const gridStart = startOfWeek(startOfMonth(anchor), WEEK_OPTS);
  const gridEnd = endOfWeek(endOfMonth(anchor), WEEK_OPTS);
  const fromKey = toDateKey(gridStart);
  const toKey = toDateKey(addDays(gridEnd, 1));

  const [patterns, overrides, activities, occurrences, events] = await Promise.all([
    supabase
      .from("custody_patterns")
      .select("*")
      .eq("family_id", session.family.id)
      .lte("starts_on", toKey)
      .order("starts_on"),
    supabase
      .from("custody_overrides")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("day", fromKey)
      .lte("day", toKey),
    supabase
      .from("activities")
      .select("*")
      .eq("family_id", session.family.id)
      .eq("active", true),
    supabase
      .from("activity_occurrences")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("day", fromKey)
      .lte("day", toKey),
    supabase
      .from("events")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("starts_at", `${fromKey}T00:00:00Z`)
      .lte("starts_at", `${toKey}T23:59:59Z`)
      .order("starts_at"),
  ]);

  return (
    <MonthView
      session={session}
      monthKey={toDateKey(startOfMonth(anchor)).slice(0, 7)}
      initialChildId={dite ?? "all"}
      patterns={(patterns.data ?? []) as CustodyPattern[]}
      overrides={(overrides.data ?? []) as CustodyOverride[]}
      activities={(activities.data ?? []) as Activity[]}
      occurrences={(occurrences.data ?? []) as ActivityOccurrence[]}
      events={(events.data ?? []) as FamilyEvent[]}
    />
  );
}
