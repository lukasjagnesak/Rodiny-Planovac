import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "./wizard";

export const metadata: Metadata = { title: "Vítejte" };

export default async function WelcomePage() {
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

  return <OnboardingWizard defaultName={profile?.full_name ?? ""} />;
}
