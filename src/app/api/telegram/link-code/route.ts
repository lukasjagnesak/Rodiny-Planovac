import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { shortCode } from "@/lib/crypto";

/** Vygeneruje nový párovací kód pro Telegram. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Nepřihlášeno" }, { status: 401 });

  const code = shortCode(6);
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ telegram_link_code: code })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ code });
}

/** Odpojení Telegramu. */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Nepřihlášeno" }, { status: 401 });

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ telegram_chat_id: null, telegram_link_code: null })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
