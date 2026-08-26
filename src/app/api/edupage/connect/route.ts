import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret } from "@/lib/crypto";
import { verifyEdupage } from "@/lib/edupage";

/** Propojení účtu EduPage — heslo se před uložením ověří a zašifruje. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Nepřihlášeno" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim();
  const heslo = String(body?.heslo ?? "");
  const subdomena = String(body?.subdomena ?? "").trim() || null;
  const diteId = body?.diteId ? Number(body.diteId) : null;

  if (!email || !heslo) {
    return NextResponse.json({ error: "Vyplň e-mail i heslo." }, { status: 400 });
  }

  try {
    // Ověříme dřív, než cokoli uložíme — ať se do databáze nedostane
    // heslo, se kterým se stejně nedá přihlásit.
    const info = await verifyEdupage({ email, heslo, subdomena, dite_id: diteId });

    const admin = createAdminClient();
    const { error } = await admin.from("edupage_accounts").upsert(
      {
        user_id: user.id,
        email,
        heslo_enc: encryptSecret(heslo),
        subdomena: info.subdomena ?? subdomena,
        dite_id: diteId,
        je_rodic: info.jeRodic,
        last_sync_error: null,
      },
      { onConflict: "user_id" },
    );

    if (error) throw error;

    return NextResponse.json({ ok: true, ...info });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Propojení se nepovedlo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Odpojení — smaže uložené přihlašovací údaje. */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Nepřihlášeno" }, { status: 401 });

  const admin = createAdminClient();
  await admin.from("edupage_accounts").delete().eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
