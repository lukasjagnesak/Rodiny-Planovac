import "server-only";

import { createAdminClient } from "./supabase/admin";
import { vyhodnot, type Predplatne, type StavPristupu } from "./predplatne-pravidla";

/** Předplatné rodiny: načtení z databáze. Pravidla jsou v `predplatne-pravidla.ts`. */

export type { Predplatne, StavPredplatneho, StavPristupu } from "./predplatne-pravidla";
export { vyhodnot } from "./predplatne-pravidla";

/**
 * Zjistí, na čem rodina je.
 *
 * Čte se servisním klíčem, protože stejnou odpověď potřebuje i webhook,
 * kde žádný přihlášený uživatel není.
 */
export async function nactiPredplatne(familyId: string): Promise<StavPristupu> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("predplatna")
    .select("family_id, stav, plati_do, stripe_customer_id, stripe_subscription_id, tarif")
    .eq("family_id", familyId)
    .maybeSingle();

  return vyhodnot((data as Predplatne | null) ?? null);
}
