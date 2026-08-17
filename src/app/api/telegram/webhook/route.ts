import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtml, sendTelegramMessage } from "@/lib/telegram";

/**
 * Webhook bota. Uživatel pošle kód z nastavení a my podle něj
 * spárujeme jeho chat s profilem.
 */
export async function POST(request: NextRequest) {
  // Telegram posílá tajemství v hlavičce — cizí požadavky zahodíme.
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = await request.json().catch(() => null);
  const message = update?.message;
  const chatId = message?.chat?.id;
  const text: string = (message?.text ?? "").trim();

  if (!chatId || !text) return NextResponse.json({ ok: true });

  const admin = createAdminClient();

  if (text === "/start" || text === "/help") {
    await sendTelegramMessage(
      String(chatId),
      "👋 Ahoj! Jsem bot <b>Rodinného plánovače</b>.\n\n" +
        "Otevři v aplikaci <b>Nastavení → Telegram notifikace</b>, opiš odtud kód a pošli mi ho sem. " +
        "Pak ti začnu posílat připomínky, kdo veze na kroužek a co se blíží.",
    );
    return NextResponse.json({ ok: true });
  }

  if (text === "/stop") {
    await admin
      .from("profiles")
      .update({ telegram_chat_id: null })
      .eq("telegram_chat_id", String(chatId));
    await sendTelegramMessage(String(chatId), "Notifikace vypnuty. Kdykoli je zapneš novým kódem.");
    return NextResponse.json({ ok: true });
  }

  // Párovací kód — 6 znaků z alfabetu bez matoucích písmen.
  const code = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== 6) {
    await sendTelegramMessage(
      String(chatId),
      "Tomu nerozumím. Pošli mi prosím <b>šestimístný kód</b> z nastavení aplikace.",
    );
    return NextResponse.json({ ok: true });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("telegram_link_code", code)
    .maybeSingle();

  if (!profile) {
    await sendTelegramMessage(
      String(chatId),
      "❌ Kód neplatí. Vygeneruj si v aplikaci nový a zkus to znovu.",
    );
    return NextResponse.json({ ok: true });
  }

  await admin
    .from("profiles")
    .update({ telegram_chat_id: String(chatId), telegram_link_code: null })
    .eq("id", profile.id);

  await sendTelegramMessage(
    String(chatId),
    `✅ Hotovo, ${escapeHtml(profile.full_name || "vítej")}! Notifikace jsou zapnuté.\n\n` +
      "Napiš <code>/stop</code>, pokud je budeš chtít vypnout.",
  );

  return NextResponse.json({ ok: true });
}
