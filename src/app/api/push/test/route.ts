import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ZNACKA } from "@/lib/brand";
import { posliPush, pushJeNastaveny } from "@/lib/push";

/** Zkušební notifikace na všechna zařízení přihlášeného uživatele. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Nepřihlášeno" }, { status: 401 });
  if (!pushJeNastaveny()) {
    return NextResponse.json({ error: "Server nemá nastavené VAPID klíče." }, { status: 500 });
  }

  const admin = createAdminClient();
  const { data: odbery } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id);

  if (!odbery || odbery.length === 0) {
    return NextResponse.json({ error: "Tohle zařízení nemá zapnuté notifikace." }, { status: 400 });
  }

  let odeslano = 0;
  for (const odber of odbery) {
    const vysledek = await posliPush(odber, {
      titulek: "🔔 Zkušební notifikace",
      telo: `${ZNACKA} je správně propojený — připomínky ti budou chodit sem.`,
      odkaz: "/prehled",
      tag: "test",
    });
    if (vysledek.ok) odeslano += 1;
    else if (vysledek.gone) await admin.from("push_subscriptions").delete().eq("endpoint", odber.endpoint);
  }

  if (odeslano === 0) {
    return NextResponse.json({ error: "Odeslání selhalo — zkus notifikace zapnout znovu." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, odeslano });
}
