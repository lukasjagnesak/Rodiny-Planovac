import { ZNACKA } from "@/lib/brand";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram";

/** Zkušební zpráva — ověří, že párování funguje. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Nepřihlášeno" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("telegram_chat_id")
    .eq("id", user.id)
    .single();

  if (!profile?.telegram_chat_id) {
    return NextResponse.json({ error: "Telegram není propojený." }, { status: 400 });
  }

  const result = await sendTelegramMessage(
    profile.telegram_chat_id,
    `🔔 <b>Zkušební zpráva</b>\n${ZNACKA} je správně propojený — připomínky ti budou chodit sem.`,
  );

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
