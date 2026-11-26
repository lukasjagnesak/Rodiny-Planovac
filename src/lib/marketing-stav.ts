import "server-only";

import { createAdminClient } from "./supabase/admin";

export type StavMarketingu = "zadny" | "ceka" | "odebira" | "zrusen";

/**
 * Stav marketingových e-mailů pro adresu účtu, z integrace v Supabase
 * (`marketing_contacts` + trvalé odhlášení v `mail_odhlaseni`).
 * Tabulky nemají politiky pro přihlášené, proto servisní klíč.
 */
export async function stavMarketingu(email: string | null | undefined): Promise<StavMarketingu> {
  if (!email) return "zadny";
  const e = email.trim().toLowerCase();
  try {
    const admin = createAdminClient();
    const [{ data: odhlasen }, { data: kontakt }] = await Promise.all([
      admin.from("mail_odhlaseni").select("email").eq("email", e).maybeSingle(),
      admin.from("marketing_contacts").select("status").eq("email", e).maybeSingle(),
    ]);
    if (odhlasen || kontakt?.status === "suppressed") return "zrusen";
    if (kontakt?.status === "confirmed") return "odebira";
    if (kontakt?.status === "pending") return "ceka";
  } catch {
    /* bez stavu se ukáže nezaškrtnuté políčko */
  }
  return "zadny";
}
