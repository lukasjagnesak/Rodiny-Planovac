import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { DokumentyScreen } from "@/components/dokumenty/dokumenty-screen";
import type { Dokument } from "@/lib/types";

export const metadata: Metadata = { title: "Doklady" };

export default async function DokladyPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const { data } = await supabase
    .from("dokumenty")
    .select("*")
    .eq("family_id", session.family.id)
    .order("created_at", { ascending: false });

  return <DokumentyScreen session={session} dokumenty={(data ?? []) as Dokument[]} />;
}
