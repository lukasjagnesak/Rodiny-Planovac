import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Zapíše, že rodina přišla přes partnera.
 *
 * Volá se hned po založení rodiny v průvodci. Přes servisní klíč, ne
 * přímo z prohlížeče: partnerské tabulky nikdo z klientů nesmí číst ani
 * zapisovat, jinak by šlo zjistit, kteří partneři existují, a připsat
 * si cizí rodinu.
 *
 * Rodina od partnera dostane období zdarma podle partnera (výchozí
 * 12 měsíců, migrace 0031) — u mediace, OSPOD i soudu je to slib,
 * se kterým nás doporučují.
 *
 * Mlčí i při odmítnutí. Odpověď „takový kód neexistuje" by z tohohle
 * koncového bodu udělala našeptávač partnerských kódů — a rodina stejně
 * nemá co řešit, doporučení je věc mezi partnerem a námi.
 */
export async function POST(request: NextRequest) {
  const telo = await request.json().catch(() => null);
  const kod = typeof telo?.kod === "string" ? telo.kod.trim().toLowerCase().slice(0, 64) : "";
  const familyId = typeof telo?.familyId === "string" ? telo.familyId : "";

  if (!kod || !familyId) return NextResponse.json({ ok: true });

  // Rodinu si smí připsat jen ten, kdo v ní je. Bez téhle kontroly by
  // stačilo znát cizí `family_id` a přiřadit ji svému kódu.
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return NextResponse.json({ ok: true });

  const admin = createAdminClient();

  const { data: clenstvi } = await admin
    .from("family_members")
    .select("id")
    .eq("family_id", familyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!clenstvi) return NextResponse.json({ ok: true });

  const { data: partner } = await admin
    .from("partneri")
    .select("id, aktivni, zdarma_mesicu")
    .ilike("kod", kod)
    .maybeSingle();

  if (!partner || !partner.aktivni) return NextResponse.json({ ok: true });

  // Jedinečnost na `family_id` hlídá databáze. Druhý pokus tedy selže,
  // a to je správně — rodina patří tomu, kdo ji doporučil první.
  const { error } = await admin.from("doporuceni").insert({
    partner_id: partner.id,
    family_id: familyId,
    kod,
  });
  if (error) return NextResponse.json({ ok: true });

  // Rodina od partnera má období zdarma podle partnera (výchozí rok).
  // Jen prodloužit, nikdy nezkrátit — zakládající rodina může mít víc.
  const mesicu = Number(partner.zdarma_mesicu ?? 0);
  if (mesicu > 0) await prodluzZdarma(admin, familyId, mesicu);

  return NextResponse.json({ ok: true });
}

/** Posune konec období zdarma na `mesicu` od založení rodiny, pokud je to později. */
async function prodluzZdarma(
  admin: ReturnType<typeof createAdminClient>,
  familyId: string,
  mesicu: number,
) {
  const [{ data: rodina }, { data: predplatne }] = await Promise.all([
    admin.from("families").select("created_at").eq("id", familyId).maybeSingle(),
    admin
      .from("predplatna")
      .select("stav, plati_do, stripe_subscription_id")
      .eq("family_id", familyId)
      .maybeSingle(),
  ]);
  if (!rodina || !predplatne) return;
  if (predplatne.stav !== "zkusebni" || predplatne.stripe_subscription_id) return;

  const konec = new Date(rodina.created_at as string);
  konec.setMonth(konec.getMonth() + mesicu);
  if (konec <= new Date(predplatne.plati_do as string)) return;

  await admin
    .from("predplatna")
    .update({ plati_do: konec.toISOString(), updated_at: new Date().toISOString() })
    .eq("family_id", familyId);
}
