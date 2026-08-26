import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { HomeworkScreen, type EdupageRow } from "@/components/edupage/homework-screen";

export const metadata: Metadata = { title: "Úkoly ze školy" };

export default async function HomeworkPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const { data } = await supabase
    .from("edupage_items")
    .select("*")
    .eq("family_id", session.family.id)
    .eq("skryto", false)
    .order("termin", { nullsFirst: false })
    .limit(200);

  return <HomeworkScreen session={session} items={(data ?? []) as EdupageRow[]} />;
}
