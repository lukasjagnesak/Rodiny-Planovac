import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { OnboardingWizard, type PredvyplnenoZKalkulacky } from "./wizard";
import type { PatternKind } from "@/lib/types";

export const metadata: Metadata = { title: "Vítejte" };

/**
 * Vyzvedne rozpis z veřejné kalkulačky a připíše ho uživateli.
 *
 * Tohle je celý smysl toho funnelu: člověk si rozpis naklikal ještě před
 * registrací, takže po přihlášení nemá začínat s prázdným kalendářem.
 */
async function prevezmiPlan(
  token: string,
  userId: string,
): Promise<PredvyplnenoZKalkulacky | null> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("kalkulacka_plany")
    .select("id, kind, anchor_date, anchor_side, weekly_map, pocet_deti, claimed_by")
    .eq("token", token)
    .maybeSingle();

  if (!data) return null;

  // Cizí rozpis si nikdo nepřipíše, ale klidně podle něj může začít —
  // odkaz se sdílí právě proto, aby si podle něj druhý rodič založil svůj.
  if (!data.claimed_by) {
    await admin
      .from("kalkulacka_plany")
      .update({ claimed_by: userId, claimed_at: new Date().toISOString() })
      .eq("id", data.id);
  }

  return {
    kind: data.kind as PatternKind,
    anchorDate: data.anchor_date as string,
    anchorSide: data.anchor_side as "a" | "b",
    weeklyMap: (data.weekly_map as string | null) ?? "aabbaab",
    pocetDeti: (data.pocet_deti as number) ?? 1,
  };
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/prihlaseni");

  const { data: memberships } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", user.id)
    .limit(1);

  if (memberships && memberships.length > 0) redirect("/prehled");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const predvyplneno = plan ? await prevezmiPlan(plan, user.id) : null;

  return (
    <OnboardingWizard
      defaultName={profile?.full_name ?? ""}
      predvyplneno={predvyplneno}
    />
  );
}
