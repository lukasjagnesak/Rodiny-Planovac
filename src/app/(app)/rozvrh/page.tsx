import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { edupageConfigured } from "@/lib/edupage";
import { RozvrhScreen } from "@/components/rozvrh/rozvrh-screen";
import { toDateKey } from "@/lib/dates";
import type { RozvrhHodina, RozvrhZmena } from "@/lib/types";

export const metadata: Metadata = { title: "Rozvrh" };

export default async function RozvrhPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const [{ data: hodiny }, { data: zmeny }, { data: edupage }] = await Promise.all([
    supabase
      .from("rozvrh_hodiny")
      .select("*")
      .eq("family_id", session.family.id)
      .order("den")
      .order("poradi"),
    // Změny platí na konkrétní den, minulé nikoho nezajímají.
    supabase
      .from("rozvrh_zmeny")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("den", toDateKey(new Date()))
      .order("den"),
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
      zmeny={(zmeny ?? []) as RozvrhZmena[]}
      edupagePropojeno={Boolean(edupage) && edupageConfigured()}
    />
  );
}
