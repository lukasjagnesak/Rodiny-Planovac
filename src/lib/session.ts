import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { ACTIVE_FAMILY_COOKIE, toMemberView } from "./members";
import type { Child, Family, FamilyMember, Profile, SessionContext } from "./types";

/**
 * Načte kompletní kontext přihlášeného uživatele.
 * Přesměruje na přihlášení nebo na onboarding, pokud kontext chybí.
 */
export async function requireSession(): Promise<SessionContext> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/prihlaseni");

  const { data: memberships } = await supabase
    .from("family_members")
    .select("*, family:families(*)")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    redirect("/vitejte");
  }

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ACTIVE_FAMILY_COOKIE)?.value;
  const active = memberships.find((m) => m.family_id === preferred) ?? memberships[0];
  const family = active.family as unknown as Family;

  const [{ data: rawMembers }, { data: children }, { data: profile }] = await Promise.all([
    supabase
      .from("family_members")
      .select("*, profile:profiles(*)")
      .eq("family_id", family.id)
      .order("created_at"),
    supabase
      .from("children")
      .select("*")
      .eq("family_id", family.id)
      .eq("archived", false)
      .order("birth_date", { nullsFirst: false }),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ]);

  const members = ((rawMembers ?? []) as unknown as (FamilyMember & {
    profile: Profile | null;
  })[]).map(toMemberView);

  return {
    userId: user.id,
    profile:
      (profile as Profile) ?? {
        id: user.id,
        full_name: user.email ?? "",
        email: user.email ?? null,
        avatar_url: null,
        phone: null,
        color: "#3f74e0",
        telegram_chat_id: null,
        telegram_link_code: null,
        locale: "cs",
      },
    family,
    members,
    children: (children ?? []) as Child[],
    myMembership: active as unknown as FamilyMember,
    allFamilies: memberships.map((m) => ({
      id: m.family_id,
      name: (m.family as unknown as Family).name,
    })),
  };
}

export { ACTIVE_FAMILY_COOKIE } from "./members";
