import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Alert } from "@/components/ui/misc";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { GoogleSettings } from "@/components/settings/google-settings";
import type { GoogleAccount } from "@/lib/types";

export const metadata: Metadata = { title: "Google kalendář" };

export default async function GoogleSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ stav?: string; chyba?: string }>;
}) {
  const { stav, chyba } = await searchParams;
  const session = await requireSession();
  const supabase = await createClient();

  const { data } = await supabase
    .from("google_accounts")
    .select("*")
    .eq("user_id", session.userId)
    .maybeSingle();

  const configured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return (
    <div className="space-y-4">
      <Link
        href="/nastaveni"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" /> Nastavení
      </Link>

      {/* Řečeno rovnou a předem. Rodič, který ví, že je funkce
          rozpracovaná, počká; ten, komu se to rozbije bez varování,
          odejde a už se nevrátí. */}
      <Alert tone="warning">
        <strong>Tahle část je ve vývoji.</strong>{" "}
        Propojení s Google kalendářem je zatím rozpracované. Události z Klidoo se do něj přenášejí, ale opačným směrem to nefunguje a synchronizace může občas zaostávat. Kdyby něco nesedělo, napiš na <a href="mailto:info@klidoo.cz" className="underline underline-offset-2">
          info@klidoo.cz
        </a>
        .
      </Alert>

      <GoogleSettings
        account={(data as GoogleAccount | null) ?? null}
        configured={configured}
        status={stav ?? null}
        error={chyba ?? null}
      />
    </div>
  );
}
