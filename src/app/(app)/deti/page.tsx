import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { FamilyScreen } from "@/components/family/family-screen";
import type { Child, FamilyInvite } from "@/lib/types";

export const metadata: Metadata = { title: "Děti a rodina" };

export default async function FamilyPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const [children, invites] = await Promise.all([
    supabase
      .from("children")
      .select("*")
      .eq("family_id", session.family.id)
      .order("archived")
      .order("name"),
    supabase
      .from("family_invites")
      .select("*")
      .eq("family_id", session.family.id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <FamilyScreen
      session={session}
      allChildren={(children.data ?? []) as Child[]}
      invites={(invites.data ?? []) as FamilyInvite[]}
    />
  );
}
