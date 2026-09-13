import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { ACTIVE_FAMILY_COOKIE, toMemberView } from "./members";
import type { Child, Family, FamilyMember, Profile, SessionContext } from "./types";

/**
 * Načte kompletní kontext přihlášeného uživatele.
 * Přesměruje na přihlášení nebo na onboarding, pokud kontext chybí.
 *
 * Obalené v `cache()`, protože tohle volá jak rozvržení aplikace, tak
 * skoro každá stránka pod ním. Bez toho běželo celé načtení dvakrát za
 * jeden požadavek — dvě ověření přihlášení a šest dotazů navíc, které
 * pokaždé vrátily totéž. `cache()` platí jen v rámci jednoho požadavku,
 * takže se tím nic nezastarává; jen se nedělá stejná práce dvakrát.
 */
export const requireSession = cache(async function requireSession(): Promise<SessionContext> {
  const supabase = await createClient();

  // `getClaims()` místo `getUser()`: podpis tokenu se dá u projektů
  // s asymetrickými klíči ověřit rovnou tady, bez volání Supabase. Když
  // projekt podepisuje starým sdíleným tajemstvím, spadne to uvnitř zpět
  // na `getUser()`, takže to nikdy není horší — jen to zrychlí, jakmile
  // se klíče v Supabase přepnou.
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  const userEmail = typeof claims?.claims.email === "string" ? claims.claims.email : null;

  if (!userId) redirect("/prihlaseni");

  // Profil nezávisí na tom, ve které rodině člověk je, takže nemá na co
  // čekat. Dřív se načítal až ve třetí vlně dotazů.
  const [{ data: memberships }, { data: profile }] = await Promise.all([
    supabase.from("family_members").select("*, family:families(*)").eq("user_id", userId),
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
  ]);

  if (!memberships || memberships.length === 0) {
    redirect("/vitejte");
  }

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ACTIVE_FAMILY_COOKIE)?.value;
  const active = memberships.find((m) => m.family_id === preferred) ?? memberships[0];
  const family = active.family as unknown as Family;

  const [{ data: rawMembers }, { data: children }] = await Promise.all([
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
  ]);

  const members = ((rawMembers ?? []) as unknown as (FamilyMember & {
    profile: Profile | null;
  })[]).map(toMemberView);

  return {
    userId,
    profile:
      (profile as Profile | null) ?? {
        id: userId,
        full_name: userEmail ?? "",
        email: userEmail,
        avatar_url: null,
        phone: null,
        color: "#3f74e0",
        locale: "cs",
        prehled_karty: null,
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
});

export { ACTIVE_FAMILY_COOKIE } from "./members";
