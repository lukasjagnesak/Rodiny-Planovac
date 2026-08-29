import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, stripeJeNastaveny } from "@/lib/stripe";
import { siteUrl } from "@/lib/google";

/**
 * Zákaznický portál Stripe — změna karty, faktury, zrušení.
 *
 * Zrušení schválně neděláme sami: ve Stripe je to jedno kliknutí
 * a rodič nemusí nikomu psát. Kdo odchází snadno, vrací se snadno.
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

  const { familyId } = (await request.json().catch(() => ({}))) as { familyId?: string };
  if (!familyId) return NextResponse.json({ chyba: "Chybí rodina." }, { status: 400 });

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
    .select("stripe_customer_id")
    .eq("family_id", familyId)
    .maybeSingle();

  if (!predplatne?.stripe_customer_id) {
    return NextResponse.json({ chyba: "Rodina zatím nic neplatila." }, { status: 400 });
  }

  const session = await stripe().billingPortal.sessions.create({
    customer: predplatne.stripe_customer_id,
    return_url: `${siteUrl()}/predplatne`,
    locale: "cs",
  });

  return NextResponse.json({ url: session.url });
}
