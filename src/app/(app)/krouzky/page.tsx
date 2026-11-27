import type { Metadata } from "next";
import { addDays, startOfWeek } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { WEEK_OPTS, toDateKey } from "@/lib/dates";
import { ActivitiesScreen } from "@/components/activities/activities-screen";
import type { Activity, ActivityOccurrence } from "@/lib/types";

export const metadata: Metadata = { title: "Kroužky" };

export default async function ActivitiesPage() {
  const session = await requireSession();
  const supabase = await createClient();

  // Doprava se plánuje na aktuální a příští týden.
  const weekStart = startOfWeek(new Date(), WEEK_OPTS);
  const from = toDateKey(weekStart);
  const to = toDateKey(addDays(weekStart, 13));

  const [activities, occurrences] = await Promise.all([
    supabase
      .from("activities")
      .select("*")
      .eq("family_id", session.family.id)
      .order("day_of_week")
      .order("starts_at"),
    supabase
      .from("activity_occurrences")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("day", from)
      .lte("day", to),
  ]);

  return (
    <ActivitiesScreen
      session={session}
      activities={(activities.data ?? []) as Activity[]}
      occurrences={(occurrences.data ?? []) as ActivityOccurrence[]}
      weekStartKey={from}
    />
  );
}
