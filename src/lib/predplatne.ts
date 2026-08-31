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

/**
 * Smí se za tohohle uživatele ještě zapisovat?
 *
 * Používá to automatická synchronizace, která běží servisním klíčem, a tedy
 * mimo RLS. Bez téhle kontroly by rodině v režimu čtení dál přibývaly úkoly
 * z EduPage a události v Googlu — a slib „po vypršení se jen čte" by neplatil.
 *
 * Stačí jedna rodina, která platí: uživatel může být ve víc rodinách
 * a odstřihnout ho kvůli té druhé by bylo nespravedlivé.
 */
export async function smiZapisovatUzivatel(userId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data: clenstvi } = await admin
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId);

  const rodiny = (clenstvi ?? []).map((c) => c.family_id as string);
  if (rodiny.length === 0) return false;

  const { data: predplatna } = await admin
    .from("predplatna")
    .select("family_id, stav, plati_do, stripe_customer_id, stripe_subscription_id, tarif")
    .in("family_id", rodiny);

  return rodiny.some((familyId) => {
    const zaznam = (predplatna ?? []).find((p) => p.family_id === familyId);
    return vyhodnot((zaznam as Predplatne | undefined) ?? null).muzeZapisovat;
  });
}
