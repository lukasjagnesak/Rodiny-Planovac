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
    .select("id, aktivni")
    .ilike("kod", kod)
    .maybeSingle();

  if (!partner || !partner.aktivni) return NextResponse.json({ ok: true });

  // Jedinečnost na `family_id` hlídá databáze. Druhý pokus tedy selže,
  // a to je správně — rodina patří tomu, kdo ji doporučil první.
  await admin.from("doporuceni").insert({
    partner_id: partner.id,
    family_id: familyId,
    kod,
  });

  return NextResponse.json({ ok: true });
}
