import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { edupageConfigured } from "@/lib/edupage";
import { RozvrhScreen } from "@/components/rozvrh/rozvrh-screen";
import type { RozvrhHodina } from "@/lib/types";

export const metadata: Metadata = { title: "Rozvrh" };

export default async function RozvrhPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const [{ data: hodiny }, { data: edupage }] = await Promise.all([
    supabase
      .from("rozvrh_hodiny")
      .select("*")
      .eq("family_id", session.family.id)
      .order("den")
      .order("poradi"),
    supabase
      .from("edupage_accounts")
      .select("user_id")
      .eq("user_id", session.userId)
      .maybeSingle(),
  ]);

  return (
    <RozvrhScreen
      session={session}
      hodiny={(hodiny ?? []) as RozvrhHodina[]}
      edupagePropojeno={Boolean(edupage) && edupageConfigured()}
    />
  );
}
