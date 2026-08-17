import type { Metadata } from "next";
import { subMonths } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { EventsScreen } from "@/components/events/events-screen";
import type { FamilyEvent } from "@/lib/types";

export const metadata: Metadata = { title: "Události" };

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ nova?: string }>;
}) {
  const { nova } = await searchParams;
  const session = await requireSession();
  const supabase = await createClient();

  // Historii držíme rok zpět, budoucnost celou.
  const from = subMonths(new Date(), 12).toISOString();

  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("family_id", session.family.id)
    .gte("starts_at", from)
    .order("starts_at");

  return (
    <EventsScreen
      session={session}
      events={(data ?? []) as FamilyEvent[]}
      prefillDate={nova ?? null}
    />
  );
}
