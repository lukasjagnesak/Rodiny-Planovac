import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { platnyToken } from "@/lib/push-nativni";

/**
 * Token zařízení z aplikace z obchodu (iPhone → APNs, Android → FCM).
 *
 * Zapisuje se servisním klíčem: když se na stejném telefonu přihlásí
 * jiný člověk, token se musí přepsat na něj, a RLS by změnu cizího
 * řádku nepustila. Kdo token posílá, ověřuje session.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nepřihlášeno" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { platforma?: unknown; token?: unknown } | null;
  if (!platnyToken(body?.platforma, body?.token)) {
    return NextResponse.json({ error: "Neplatný token." }, { status: 400 });
  }
  const druh = body!.platforma === "ios" ? "apns" : "fcm";

  const { error } = await createAdminClient()
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: `${druh}:${body!.token}`,
        druh,
        p256dh: "",
        auth: "",
        user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
      },
      { onConflict: "endpoint" },
    );
  if (error) return NextResponse.json({ error: "Uložení se nepovedlo." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Vypnutí notifikací na tomto zařízení. */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nepřihlášeno" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { platforma?: unknown; token?: unknown } | null;
  if (!platnyToken(body?.platforma, body?.token)) return NextResponse.json({ ok: true });
  const druh = body!.platforma === "ios" ? "apns" : "fcm";
  await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", `${druh}:${body!.token}`);
  return NextResponse.json({ ok: true });
}
