"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui/misc";
import { prihlasPres } from "@/lib/oauth";
import { jeNativni } from "@/lib/nativni-most";
import { cn } from "@/lib/format";

/** Logo Facebooku. Pravidla značky Meta: bílé „f“ na modré #1877F2. */
function LogoFacebook({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-[20px] w-[20px] shrink-0", className)} aria-hidden>
      <path
        fill="currentColor"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"
      />
    </svg>
  );
}

/**
 * Přihlášení a registrace přes Facebook.
 *
 * Hlavní důvod: lidé z reklam na Instagramu a Facebooku otevírají web
 * v prohlížeči uvnitř těchto aplikací, a tam Google přihlášení blokuje
 * („disallowed_useragent“). Facebook v něm funguje na jedno klepnutí.
 *
 * Kdo má Facebook jen na telefonní číslo, e-mail nám Facebook nepředá
 * a Supabase přihlášení odmítne — pro něj zůstává registrace e-mailem.
 */
export function PrihlaseniFacebook({
  popisek = "Pokračovat přes Facebook",
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
    // V aplikaci z obchodu jde přes systémový prohlížeč (lib/oauth.ts).
    const potiz = await prihlasPres(supabase, "facebook", dal);

    if (potiz) {
      setBusy(false);
      setError(
        potiz.message.includes("provider is not enabled")
          ? "Přihlášení přes Facebook zatím není zapnuté."
          : "Přihlášení přes Facebook se nepovedlo. Pokud máte Facebook bez e-mailu, zaregistrujte se e-mailem.",
      );
    }
    // Při úspěchu odchází prohlížeč na Facebook, takže stav necháváme běžet.
    // V aplikaci zůstává stránka pod systémovým prohlížečem — kdyby ho
    // člověk zavřel bez přihlášení, tlačítko nesmí zůstat zaseknuté.
    else if (jeNativni()) setBusy(false);
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={prihlas}
        disabled={busy}
        className={cn(
          "flex h-11 w-full items-center justify-center gap-2.5 rounded-xl",
          "bg-[#1877F2] font-medium text-white",
          "transition-opacity hover:opacity-90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
          "disabled:cursor-progress disabled:opacity-60",
        )}
      >
        {busy ? <Spinner /> : <LogoFacebook />}
        {popisek}
      </button>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
