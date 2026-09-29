import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { KontaktyScreen } from "@/components/kontakty/kontakty-screen";
import type { Kontakt } from "@/lib/types";

export const metadata: Metadata = { title: "Kontakty" };

export default async function KontaktyPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const { data } = await supabase
    .from("kontakty")
    .select("*")
    .eq("family_id", session.family.id)
    .order("poradi")
    .order("jmeno");

  return <KontaktyScreen session={session} kontakty={(data ?? []) as Kontakt[]} />;
}
