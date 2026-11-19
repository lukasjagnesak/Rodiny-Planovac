import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { DarkyScreen } from "@/components/darky/darky-screen";
import type { Darek } from "@/lib/types";

export const metadata: Metadata = { title: "Dárky" };

export default async function DarkyPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const { data } = await supabase
    .from("darky")
    .select("*")
    .eq("family_id", session.family.id)
    .order("created_at", { ascending: false })
    .limit(500);

  return <DarkyScreen session={session} darky={(data ?? []) as Darek[]} />;
}
