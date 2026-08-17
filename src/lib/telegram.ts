import "server-only";

const API = "https://api.telegram.org";

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

function apiUrl(method: string): string {
  return `${API}/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;
}

/** Escapování pro parse_mode=HTML — jediné, co Telegram vyžaduje. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!telegramConfigured()) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN není nastavený." };
  }

  try {
    const response = await fetch(apiUrl("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();
    if (!data.ok) return { ok: false, error: data.description ?? "Telegram odmítl zprávu." };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Odeslání selhalo." };
  }
}

/** Nastaví webhook, aby bot dostával zprávy od uživatelů (párování účtu). */
export async function setTelegramWebhook(url: string): Promise<{ ok: boolean; error?: string }> {
  if (!telegramConfigured()) return { ok: false, error: "TELEGRAM_BOT_TOKEN není nastavený." };

  const response = await fetch(apiUrl("setWebhook"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ["message"],
    }),
  });

  const data = await response.json();
  return data.ok ? { ok: true } : { ok: false, error: data.description };
}

export async function getBotUsername(): Promise<string | null> {
  if (!telegramConfigured()) return null;
  try {
    const response = await fetch(apiUrl("getMe"), { cache: "no-store" });
    const data = await response.json();
    return data.ok ? (data.result.username as string) : null;
  } catch {
    return null;
  }
}
