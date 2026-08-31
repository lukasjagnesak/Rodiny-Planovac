import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, tarifZCeny } from "@/lib/stripe";
import { zaznamenej } from "@/lib/provoz";
import { posliMail } from "@/lib/mail";
import { prvniPlatbaZprava } from "@/lib/mail-sablony";
import { korun, tarifPodleId } from "@/lib/tarify";
import { siteUrl } from "@/lib/google";
import type { StavPredplatneho } from "@/lib/predplatne-pravidla";

/**
 * Webhook ze Stripe — jediné místo, kde se mění stav předplatného.
 *
 * Návrat z Checkoutu se nepočítá: prohlížeč se může zavřít dřív, než se
 * někam dostane, a naopak jde na tu URL přijít i bez placení. Věříme
 * jen podepsané události.
 */

// Podpis se počítá z přesných bajtů těla, takže žádné parsování předem.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const tajemstvi = process.env.STRIPE_WEBHOOK_SECRET;
  if (!tajemstvi) {
    return NextResponse.json({ chyba: "Webhook není nastavený." }, { status: 503 });
  }

  const podpis = request.headers.get("stripe-signature");
  if (!podpis) return NextResponse.json({ chyba: "Chybí podpis." }, { status: 400 });

  const telo = await request.text();

  let udalost: Stripe.Event;
  try {
    udalost = await stripe().webhooks.constructEventAsync(telo, podpis, tajemstvi);
  } catch (chyba) {
    const zprava = chyba instanceof Error ? chyba.message : "neznámá chyba";
    return NextResponse.json({ chyba: `Neplatný podpis: ${zprava}` }, { status: 400 });
  }

  try {
    await zpracuj(udalost);
  } catch (chyba) {
    // Nevrátíme 500 zbytečně — Stripe by událost opakoval pět dní.
    // Chybu ale musí být vidět v logu.
    console.error("[stripe] zpracování selhalo", udalost.type, chyba);
    return NextResponse.json({ chyba: "Zpracování selhalo." }, { status: 500 });
  }

  return NextResponse.json({ prijato: true });
}

async function zpracuj(udalost: Stripe.Event): Promise<void> {
  switch (udalost.type) {
    case "checkout.session.completed": {
      const session = udalost.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.subscription) return;
      const predplatne = await stripe().subscriptions.retrieve(
        typeof session.subscription === "string" ? session.subscription : session.subscription.id,
      );
      await uloz(predplatne, session.client_reference_id ?? null);
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await uloz(udalost.data.object as Stripe.Subscription, null);
      return;
    }

    case "customer.subscription.trial_will_end": {
      // Stripe to posílá tři dny předem. Nečekané stržení je nejrychlejší
      // cesta ke sporu s bankou, tak radši připomenout.
      await upozorniNaPrvniPlatbu(udalost.data.object as Stripe.Subscription);
      return;
    }

    case "invoice.payment_failed":
    case "invoice.paid": {
      // Faktura sama o sobě stav neurčuje — sáhneme si pro předplatné,
      // protože jen ono ví, do kdy je zaplaceno.
      const faktura = udalost.data.object as Stripe.Invoice & {
        subscription?: string | Stripe.Subscription | null;
      };
      const odkaz = faktura.subscription ?? idZFaktury(faktura);
      if (!odkaz) return;
      const predplatne = await stripe().subscriptions.retrieve(
        typeof odkaz === "string" ? odkaz : odkaz.id,
      );
      await uloz(predplatne, null);
      return;
    }

    default:
      return;
  }
}

/** Od API 2025 visí předplatné na řádcích faktury, ne na faktuře. */
function idZFaktury(faktura: Stripe.Invoice): string | null {
  for (const radek of faktura.lines?.data ?? []) {
    const parent = (radek as unknown as {
      parent?: { subscription_item_details?: { subscription?: string } };
    }).parent;
    const id = parent?.subscription_item_details?.subscription;
    if (id) return id;
  }
  return null;
}

/**
 * Ze stavu ve Stripe udělá náš stav.
 *
 * `zruseno` neznamená hned zámek: `plati_do` zůstává na konci zaplaceného
 * období a `vyhodnot()` do té doby zápis pouští.
 */
function prelozStav(stav: Stripe.Subscription.Status): StavPredplatneho {
  switch (stav) {
    case "active":
    case "trialing":
      return "aktivni";
    case "past_due":
    case "unpaid":
      return "po_splatnosti";
    case "canceled":
      return "zruseno";
    case "incomplete_expired":
      return "vyprsel";
    case "incomplete":
    case "paused":
    default:
      return "po_splatnosti";
  }
}

/** Konec zaplaceného období. V nové verzi API je na položkách, ne na předplatném. */
function platiDo(predplatne: Stripe.Subscription): string {
  const konce = predplatne.items.data
    .map((polozka) => polozka.current_period_end)
    .filter((cas): cas is number => typeof cas === "number");

  const konec = konce.length > 0 ? Math.max(...konce) : predplatne.cancel_at ?? predplatne.ended_at;

  return new Date((konec ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();
}

async function uloz(predplatne: Stripe.Subscription, zaloha: string | null): Promise<void> {
  const familyId = predplatne.metadata?.family_id ?? zaloha ?? (await rodinaPodleZakaznika(predplatne));
  if (!familyId) {
    console.error("[stripe] předplatné bez rodiny", predplatne.id);
    return;
  }

  const admin = createAdminClient();

  // Stav před zápisem: podle něj se pozná první zaplacení. Bez toho by se
  // do trychtýře počítalo i každé měsíční obnovení a čísla by lhala.
  const { data: predtim } = await admin
    .from("predplatna")
    .select("stav")
    .eq("family_id", familyId)
    .maybeSingle();

  const novyStav = prelozStav(predplatne.status);

  const { error } = await admin
    .from("predplatna")
    .update({
      stav: novyStav,
      plati_do: platiDo(predplatne),
      stripe_customer_id:
        typeof predplatne.customer === "string" ? predplatne.customer : predplatne.customer.id,
      stripe_subscription_id: predplatne.id,
      tarif: tarifZCeny(predplatne.items.data[0]?.price?.id) ?? predplatne.metadata?.tarif ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("family_id", familyId);

  if (error) throw new Error(error.message);

  // Poslední krok trychtýře, a jen jednou: při přechodu na zaplaceno.
  // Bez otisku návštěvníka — tohle chodí ze Stripu, ne z prohlížeče.
  if (novyStav === "aktivni" && predtim?.stav !== "aktivni") {
    await zaznamenej("predplatne");
  }
}

/** E-mail „za tři dny odejde první platba" všem správcům rodiny. */
async function upozorniNaPrvniPlatbu(predplatne: Stripe.Subscription): Promise<void> {
  const familyId =
    predplatne.metadata?.family_id ?? (await rodinaPodleZakaznika(predplatne));
  if (!familyId || !predplatne.trial_end) return;

  const dni = Math.ceil((predplatne.trial_end * 1000 - Date.now()) / (24 * 60 * 60 * 1000));
  const tarif = tarifPodleId(
    tarifZCeny(predplatne.items.data[0]?.price?.id) ?? predplatne.metadata?.tarif,
  );

  const admin = createAdminClient();
  const { data: clenove } = await admin
    .from("family_members")
    .select("profile:profiles(email, full_name)")
    .eq("family_id", familyId)
    .in("role", ["owner", "parent"]);

  for (const clen of clenove ?? []) {
    const profil = clen.profile as unknown as { email: string | null } | null;
    if (!profil?.email) continue;

    await posliMail(
      profil.email,
      prvniPlatbaZprava({
        dni,
        castka: tarif ? korun(tarif.cena) : "předplatné",
        odkaz: `${siteUrl()}/predplatne`,
      }),
    );
  }
}

/** Poslední záchrana: dohledat rodinu podle zákazníka. */
async function rodinaPodleZakaznika(predplatne: Stripe.Subscription): Promise<string | null> {
  const customerId =
    typeof predplatne.customer === "string" ? predplatne.customer : predplatne.customer.id;

  const admin = createAdminClient();
  const { data } = await admin
    .from("predplatna")
    .select("family_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return data?.family_id ?? null;
}
