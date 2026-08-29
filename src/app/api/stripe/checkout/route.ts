import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cenaId, stripe, stripeJeNastaveny } from "@/lib/stripe";
import { siteUrl } from "@/lib/google";
import type { Tarif } from "@/lib/tarify";

/**
 * Start platby. Vrací URL do Stripe Checkoutu.
 *
 * Platí rodina, ne uživatel: `client_reference_id` i metadata nesou
 * `family_id`, aby webhook věděl, komu odemknout. Zákazníka ve Stripe
 * držíme jednoho na rodinu — jinak by po roce vznikly dva a druhý rodič
 * by platil podruhé.
 */
export async function POST(request: NextRequest) {
  if (!stripeJeNastaveny()) {
    return NextResponse.json({ chyba: "Platební brána zatím není nastavená." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ chyba: "Nepřihlášeno." }, { status: 401 });

  const telo = (await request.json().catch(() => ({}))) as {
    familyId?: string;
    tarif?: Tarif;
  };
  const familyId = telo.familyId;
  const tarif: Tarif = telo.tarif === "rocni" ? "rocni" : "mesicni";

  if (!familyId) {
    return NextResponse.json({ chyba: "Chybí rodina." }, { status: 400 });
  }

  // Platit smí jen ten, kdo v rodině něco spravuje.
  const { data: clenstvi } = await supabase
    .from("family_members")
    .select("role")
    .eq("family_id", familyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!clenstvi || !["owner", "parent", "guardian"].includes(clenstvi.role as string)) {
    return NextResponse.json({ chyba: "K této rodině nemáš přístup." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: predplatne } = await admin
    .from("predplatna")
    .select("stripe_customer_id, stripe_subscription_id, stav")
    .eq("family_id", familyId)
    .maybeSingle();

  if (predplatne?.stripe_subscription_id && predplatne.stav === "aktivni") {
    return NextResponse.json({ chyba: "Rodina už předplatné má." }, { status: 409 });
  }

  const s = stripe();
  let customerId = predplatne?.stripe_customer_id ?? null;

  if (!customerId) {
    const { data: rodina } = await admin
      .from("families")
      .select("name")
      .eq("id", familyId)
      .maybeSingle();

    const zakaznik = await s.customers.create({
      email: user.email ?? undefined,
      name: rodina?.name ?? undefined,
      metadata: { family_id: familyId },
    });
    customerId = zakaznik.id;

    await admin
      .from("predplatna")
      .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
      .eq("family_id", familyId);
  }

  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: familyId,
    line_items: [{ price: cenaId(tarif)!, quantity: 1 }],
    subscription_data: { metadata: { family_id: familyId, tarif } },
    metadata: { family_id: familyId, tarif },
    allow_promotion_codes: true,
    locale: "cs",
    billing_address_collection: "auto",
    success_url: `${siteUrl()}/predplatne?stav=hotovo`,
    cancel_url: `${siteUrl()}/predplatne?stav=zruseno`,
  });

  return NextResponse.json({ url: session.url });
}
