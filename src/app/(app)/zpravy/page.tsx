import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { nactiPredplatne } from "@/lib/predplatne";
import { ZpravyScreen } from "@/components/zpravy/zpravy-screen";
import type { Zprava } from "@/lib/zpravy";

export const metadata: Metadata = { title: "Zprávy" };

export default async function ZpravyPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const [{ data }, pristup] = await Promise.all([
    supabase
      .from("zpravy")
      .select("*, precteni:zpravy_precteni(user_id, precteno_at)")
      .eq("family_id", session.family.id)
      .order("created_at", { ascending: true })
      .limit(500),
    nactiPredplatne(session.family.id),
  ]);

  return (
    <ZpravyScreen
      session={session}
      zpravy={(data ?? []) as Zprava[]}
      muzePsat={pristup.muzeZapisovat && session.myMembership.role !== "viewer"}
    />
  );
}
