import "server-only";

import { createAdminClient } from "./supabase/admin";
import { stripe, stripeJeNastaveny } from "./stripe";

/**
 * Mazání rodiny a účtu.
 *
 * Zásady ochrany osobních údajů slibují, že si účet i rodinu smaže člověk
 * sám v nastavení — takže to musí opravdu jít, a musí to opravdu mazat.
 *
 * Tři věci, na které se u „smazat" nejčastěji zapomene a data zůstanou:
 *  1. Úložiště. Účtenky a doklady leží mimo databázi, takže je kaskáda
 *     cizích klíčů nesmaže — fotka lyžáku by přežila celou rodinu.
 *  2. Předplatné ve Stripe. Bez zrušení běží platby dál za data,
 *     která už neexistují. To je to nejhorší, co může zákazník zažít.
 *  3. Rodina, ve které nikdo nezbyl. Osiřelý řádek nikdo nikdy neuvidí,
 *     ale osobní údaje v něm zůstanou ležet.
 */

const BUCKETY = ["receipts", "dokumenty"] as const;

/**
 * Smaže všechno, co v úložišti patří rodině.
 *
 * Cesty vypadají `<rodina>/<výdaj|dítě>/<soubor>`, takže se prochází
 * o patro níž — `list` vrací jen jednu úroveň.
 */
async function smazUloziste(familyId: string): Promise<number> {
  const admin = createAdminClient();
  let smazano = 0;

  for (const bucket of BUCKETY) {
    const { data: slozky } = await admin.storage.from(bucket).list(familyId);

    for (const slozka of slozky ?? []) {
      const { data: soubory } = await admin.storage
        .from(bucket)
        .list(`${familyId}/${slozka.name}`);

      const cesty = (soubory ?? []).map((s) => `${familyId}/${slozka.name}/${s.name}`);
      if (cesty.length === 0) continue;

      const { error } = await admin.storage.from(bucket).remove(cesty);
      if (!error) smazano += cesty.length;
    }
  }

  return smazano;
}

/** Zruší předplatné ve Stripe, aby se neplatilo za smazaná data. */
async function zrusPredplatne(familyId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("predplatna")
    .select("stripe_subscription_id")
    .eq("family_id", familyId)
    .maybeSingle();

  const id = data?.stripe_subscription_id;
  if (!id || !stripeJeNastaveny()) return false;

  try {
    await stripe().subscriptions.cancel(id);
    return true;
  } catch (chyba) {
    // Předplatné může být zrušené už dřív — to není důvod nechat data.
    console.error("[mazani] zrušení předplatného selhalo", id, chyba);
    return false;
  }
}

export interface VysledekMazani {
  rodin: number;
  souboru: number;
  predplatnychZruseno: number;
}

/**
 * Smaže rodinu i s obsahem. Volající musí ověřit, že o to žádá vlastník.
 *
 * Databáze zbytek zařídí kaskádou cizích klíčů — děti, výdaje, události,
 * kroužky, doklady i členství visí na `families`.
 */
export async function smazRodinu(familyId: string): Promise<VysledekMazani> {
  const zruseno = await zrusPredplatne(familyId);
  const souboru = await smazUloziste(familyId);

  const admin = createAdminClient();
  const { error } = await admin.from("families").delete().eq("id", familyId);
  if (error) throw new Error(error.message);

  return { rodin: 1, souboru, predplatnychZruseno: zruseno ? 1 : 0 };
}

/**
 * Smaže účet.
 *
 * Rodiny, ve kterých by po odchodu nikdo nezbyl, mizí s ním. Tam, kde
 * zůstávají další lidé, se rodina nechává — jinak by odchod jednoho
 * rodiče vzal kalendář i tomu druhému. Když odchází vlastník, správu
 * přebírá nejdéle přítomný z ostatních; rodina bez vlastníka by se už
 * nedala spravovat ani smazat.
 */
export async function smazUcet(userId: string): Promise<VysledekMazani> {
  const admin = createAdminClient();
  const souhrn: VysledekMazani = { rodin: 0, souboru: 0, predplatnychZruseno: 0 };

  const { data: mojeClenstvi } = await admin
    .from("family_members")
    .select("family_id, role")
    .eq("user_id", userId);

  for (const clenstvi of mojeClenstvi ?? []) {
    const familyId = clenstvi.family_id as string;

    const { data: ostatni } = await admin
      .from("family_members")
      .select("user_id, role, created_at")
      .eq("family_id", familyId)
      .neq("user_id", userId)
      .order("created_at");

    if (!ostatni || ostatni.length === 0) {
      const vysledek = await smazRodinu(familyId);
      souhrn.rodin += vysledek.rodin;
      souhrn.souboru += vysledek.souboru;
      souhrn.predplatnychZruseno += vysledek.predplatnychZruseno;
      continue;
    }

    if (clenstvi.role === "owner") {
      const nastupce =
        ostatni.find((c) => c.role === "parent") ??
        ostatni.find((c) => c.role === "guardian") ??
        ostatni[0];

      await admin
        .from("family_members")
        .update({ role: "owner" })
        .eq("family_id", familyId)
        .eq("user_id", nastupce.user_id);
    }
  }

  // Členství, profil i osobní propojení visí na uživateli kaskádou.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  return souhrn;
}
