import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACTIVE_FAMILY_COOKIE } from "@/lib/members";
import { VYZIVNE_NEDELI_SE, VYZIVNE_TITULEK } from "@/lib/vyzivne-plan";

export const metadata = { robots: { index: false, follow: false } };

/**
 * Převzetí výpočtu z kalkulačky výživného.
 *
 * Jedno místo pro všechny případy, protože se jich sešlo víc, než se
 * zdálo, a každý z nich uměl výpočet tiše zahodit:
 *
 *   - kdo tu ještě nemá rodinu, jde do průvodce a výpočet si nese s sebou;
 *   - kdo rodinu má, dostane výživné rovnou do ní — zakládat druhou
 *     rodinu jen proto, že si někdo zkusil kalkulačku, je nesmysl;
 *   - kdo plán už jednou převzal, nedostane ho podruhé.
 *
 * Právě ten druhý případ chyběl. `/vitejte` totiž každého, kdo rodinu
 * má, mlčky posílá na přehled — takže se výpočet zahodil přesně těm
 * lidem, kteří Klidoo už používají.
 */
export default async function PrevzitVyzivne({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/prehled");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/prihlaseni");

  const { data: memberships } = await supabase
    .from("family_members")
    .select("family_id, custody_side")
    .eq("user_id", user.id);

  // Bez rodiny se jde do průvodce — ten si plán vyzvedne sám.
  if (!memberships || memberships.length === 0) {
    redirect(`/vitejte?vyzivne=${encodeURIComponent(token)}`);
  }

  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("vyzivne_plany")
    .select("id, plati, castka, claimed_by")
    .eq("token", token)
    .maybeSingle();

  if (!plan) redirect("/prehled");
  if (plan.claimed_by) redirect("/vydaje?prevzato=uz");

  const castka = Number(plan.castka);
  if (!plan.plati || castka <= 0) {
    // Podle zadání se výživné nestanovuje. Zakládat nulovou položku
    // by byl jen zmatek; plán se ale označí, ať se nenabízí znovu.
    await admin
      .from("vyzivne_plany")
      .update({ claimed_by: user.id, claimed_at: new Date().toISOString() })
      .eq("id", plan.id);
    redirect("/vydaje?prevzato=bez-castky");
  }

  // Do které rodiny. Stejné pravidlo jako v `requireSession()`: naposled
  // vybraná z cookie, jinak první.
  const cookieStore = await cookies();
  const preferred = cookieStore.get(ACTIVE_FAMILY_COOKIE)?.value;
  const clenstvi =
    memberships.find((m) => m.family_id === preferred) ?? memberships[0];
  const familyId = clenstvi.family_id;

  // Zapisuje se klientem přihlášeného člověka, ne servisním klíčem —
  // ať platí stejná pravidla jako na cokoli jiného, co v aplikaci založí.
  const { error } = await supabase.from("vydaje_opakovane").insert({
    family_id: familyId,
    category: "alimony",
    title: VYZIVNE_TITULEK,
    amount: castka,
    frekvence: "mesicne",
    split_percent: VYZIVNE_NEDELI_SE,
    // Plátce jen tehdy, když jím je přihlášený člověk. U příjemce
    // zůstane prázdné — druhý rodič tu svůj profil mít nemusí.
    paid_by: clenstvi.custody_side === plan.plati ? user.id : null,
    created_by: user.id,
    note: "Orientační částka z kalkulačky na klidoo.cz. Upravte ji podle skutečnosti.",
  });

  if (error) {
    console.error("[prevzit/vyzivne] položka se nezaložila:", error.message);
    redirect("/vydaje?prevzato=chyba");
  }

  await admin
    .from("vyzivne_plany")
    .update({ claimed_by: user.id, claimed_at: new Date().toISOString() })
    .eq("id", plan.id);

  redirect("/vydaje?prevzato=vyzivne");
}
