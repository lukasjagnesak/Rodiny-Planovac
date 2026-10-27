import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { posliPush, pushJeNastaveny } from "@/lib/push";
import { rozsahDnu } from "@/lib/zadosti";

/**
 * Upozorní druhého rodiče na žádost o změnu rozvrhu (nebo navrhujícího
 * na odpověď). Samotná žádost i odpověď už v databázi jsou — tohle je
 * jen notifikace navíc, a když selže, nic se neztratí: žádost svítí
 * v kalendáři a je i ve Zprávách.
 *
 * Komu se posílá, se určuje tady ze stavu žádosti, ne z těla požadavku.
 * Jinak by šlo poslat cizímu členovi rodiny libovolnou notifikaci.
 */
export async function POST(request: NextRequest) {
  const telo = await request.json().catch(() => null);
  const zadostId = typeof telo?.zadostId === "string" ? telo.zadostId : "";
  if (!zadostId || !pushJeNastaveny()) return NextResponse.json({ ok: true });

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const ja = claims?.claims.sub;
  if (!ja) return NextResponse.json({ ok: true });

  // Přes klienta přihlášeného uživatele: RLS pustí jen žádost jeho rodiny.
  const { data: z } = await supabase
    .from("zadosti_zmeny")
    .select("id, family_id, od, do_dne, vymena_od, stav, navrhl, navrhl_jmeno")
    .eq("id", zadostId)
    .maybeSingle();
  if (!z) return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  let komu: string[] = [];
  let titulek = "";
  const rozsah = rozsahDnu(String(z.od), String(z.do_dne));

  if (z.stav === "ceka") {
    // Upozornit na nový návrh smí jen ten, kdo ho podal.
    if (z.navrhl !== ja) return NextResponse.json({ ok: true });
    const { data: rodice } = await admin
      .from("family_members")
      .select("user_id")
      .eq("family_id", z.family_id)
      .in("role", ["owner", "parent"])
      .not("custody_side", "is", null);
    komu = (rodice ?? []).map((r) => String(r.user_id)).filter((u) => u !== ja);
    titulek = z.vymena_od
      ? `${z.navrhl_jmeno} navrhuje prohození ${rozsah}`
      : `${z.navrhl_jmeno} navrhuje změnu rozvrhu ${rozsah}`;
  } else if (z.stav === "schvaleno" || z.stav === "zamitnuto") {
    if (!z.navrhl || z.navrhl === ja) return NextResponse.json({ ok: true });
    komu = [String(z.navrhl)];
    titulek = `Změna rozvrhu ${rozsah}: ${z.stav === "schvaleno" ? "schváleno" : "zamítnuto"}`;
  }
  if (komu.length === 0) return NextResponse.json({ ok: true });

  const { data: odbery } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", komu);

  for (const odber of odbery ?? []) {
    const vysledek = await posliPush(
      { endpoint: String(odber.endpoint), p256dh: String(odber.p256dh), auth: String(odber.auth) },
      { titulek, telo: "Podrobnosti v Kalendáři.", odkaz: "/kalendar", tag: `zadost-${z.id}` },
    );
    if (vysledek.gone) await admin.from("push_subscriptions").delete().eq("id", odber.id);
  }

  return NextResponse.json({ ok: true });
}
