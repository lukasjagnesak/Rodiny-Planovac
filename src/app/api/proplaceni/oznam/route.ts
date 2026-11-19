import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { posliPush, pushJeNastaveny } from "@/lib/push";
import { formatMoney } from "@/lib/format";

/**
 * Upozorní druhého rodiče na žádost o proplacení (nebo žadatele na
 * odpověď). Žádost i zpráva už v databázi jsou — když notifikace
 * selže, nic se neztratí.
 *
 * Komu se posílá, se určuje ze stavu žádosti, ne z těla požadavku,
 * a jen ten, kdo stav právě způsobil, smí upozornění vyvolat.
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
    .from("zadosti_proplaceni")
    .select("id, family_id, castka, stav, pozadal, pozadal_jmeno, odpovedel, odpovedel_jmeno, expense:expenses(title, currency)")
    .eq("id", zadostId)
    .maybeSingle();
  if (!z) return NextResponse.json({ ok: true });

  const vydaj = z.expense as unknown as { title: string; currency: string } | null;
  const castka = formatMoney(Number(z.castka), vydaj?.currency ?? "CZK");
  const admin = createAdminClient();
  let komu: string[] = [];
  let titulek = "";

  if (z.stav === "ceka") {
    if (z.pozadal !== ja) return NextResponse.json({ ok: true });
    const { data: rodice } = await admin
      .from("family_members")
      .select("user_id")
      .eq("family_id", z.family_id)
      .in("role", ["owner", "parent"])
      .not("custody_side", "is", null);
    komu = (rodice ?? []).map((r) => String(r.user_id)).filter((u) => u !== ja);
    titulek = `${z.pozadal_jmeno} žádá o proplacení ${castka}`;
  } else if (z.stav === "schvaleno" || z.stav === "rozporovano") {
    if (z.odpovedel !== ja || !z.pozadal) return NextResponse.json({ ok: true });
    komu = [String(z.pozadal)];
    titulek =
      z.stav === "schvaleno"
        ? `${z.odpovedel_jmeno} schválil(a) proplacení ${castka}`
        : `${z.odpovedel_jmeno} rozporuje proplacení ${castka}`;
  } else if (z.stav === "zaplaceno") {
    if (z.pozadal !== ja || !z.odpovedel) return NextResponse.json({ ok: true });
    komu = [String(z.odpovedel)];
    titulek = `${z.pozadal_jmeno} potvrdil(a) příjem ${castka}`;
  }
  if (komu.length === 0) return NextResponse.json({ ok: true });

  const { data: odbery } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", komu);

  for (const odber of odbery ?? []) {
    const vysledek = await posliPush(
      { endpoint: String(odber.endpoint), p256dh: String(odber.p256dh), auth: String(odber.auth) },
      {
        titulek,
        telo: vydaj?.title ? `${vydaj.title}. Podrobnosti ve Výdajích.` : "Podrobnosti ve Výdajích.",
        odkaz: "/vydaje",
        tag: `proplaceni-${z.id}`,
        ikona: "bankovka",
      },
    );
    if (vysledek.gone) await admin.from("push_subscriptions").delete().eq("id", odber.id);
  }

  return NextResponse.json({ ok: true });
}
