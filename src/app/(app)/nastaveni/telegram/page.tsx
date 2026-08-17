import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/session";
import { getBotUsername, telegramConfigured } from "@/lib/telegram";
import { TelegramSettings } from "@/components/settings/telegram-settings";

export const metadata: Metadata = { title: "Telegram notifikace" };

export default async function TelegramSettingsPage() {
  const session = await requireSession();
  const botUsername = await getBotUsername();

  return (
    <div className="space-y-4">
      <Link
        href="/nastaveni"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" /> Nastavení
      </Link>

      <TelegramSettings
        connected={Boolean(session.profile.telegram_chat_id)}
        pendingCode={session.profile.telegram_link_code}
        botUsername={botUsername}
        configured={telegramConfigured()}
      />
    </div>
  );
}
