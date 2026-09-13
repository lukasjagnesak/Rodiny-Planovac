"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui/misc";
import { cn } from "@/lib/format";

/**
 * Logo Apple. Podmínky užití určují i tvar tlačítka: buď celé černé
 * s bílým logem, nebo bílé s černým — nikdy obarvené do vlastní palety
 * a nikdy menší než ostatní možnosti přihlášení.
 */
function LogoApple({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-[19px] w-[19px] shrink-0", className)} aria-hidden>
      <path
        fill="currentColor"
        d="M17.05 12.53c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.73-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.87-.76-1.48.02-2.84.86-3.6 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.25 2.74 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.7.71 2.87.69 1.18-.02 1.93-1.08 2.65-2.14.83-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.32-3.5ZM14.87 5.9c.6-.74 1.01-1.75.9-2.77-.87.04-1.93.58-2.56 1.31-.56.65-1.05 1.69-.92 2.68.97.08 1.96-.49 2.58-1.22Z"
      />
    </svg>
  );
}

/**
 * Přihlášení a registrace přes Apple.
 *
 * Pro App Store to není volitelné: kdo v aplikaci nabízí přihlášení přes
 * jinou službu (u nás Google), musí podle pravidel nabídnout i Apple.
 * Na webu to škodu nedělá — část lidí Apple ID záměrně používá kvůli
 * skrytému e-mailu.
 *
 * Apple posílá jméno jen při ÚPLNĚ PRVNÍM přihlášení a jen když ho člověk
 * nezatají. Profil proto může vzniknout bez jména a doplní se až
 * v nastavení; `session.ts` na to je připravený, protože stejná situace
 * nastává u přihlášení odkazem z e-mailu.
 */
export function PrihlaseniApple({
  popisek = "Pokračovat přes Apple",
  dal = "/prehled",
  className,
}: {
  popisek?: string;
  dal?: string;
  className?: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function prihlas() {
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: potiz } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?dal=${encodeURIComponent(dal)}`,
      },
    });

    if (potiz) {
      setBusy(false);
      setError(
        potiz.message.includes("provider is not enabled")
          ? "Přihlášení přes Apple zatím není zapnuté."
          : "Přihlášení přes Apple se nepovedlo. Zkus to prosím znovu.",
      );
    }
    // Při úspěchu odchází prohlížeč k Applu, takže stav necháváme běžet.
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={prihlas}
        disabled={busy}
        className={cn(
          "flex h-11 w-full items-center justify-center gap-2.5 rounded-xl",
          "bg-[#000000] font-medium text-white",
          "transition-opacity hover:opacity-90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
          "disabled:cursor-progress disabled:opacity-60",
        )}
      >
        {busy ? <Spinner /> : <LogoApple />}
        {popisek}
      </button>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
