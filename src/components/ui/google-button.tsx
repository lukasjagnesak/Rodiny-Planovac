"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui/misc";
import { cn } from "@/lib/format";

/** Logo Google. Podmínky užití vyžadují originální barvy, ne obarvení podle motivu. */
function LogoGoogle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-[18px] w-[18px] shrink-0", className)} aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.92l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.28a12 12 0 0 0 0 10.75l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.63l4.01 3.1C6.23 6.87 8.88 4.75 12 4.75Z"
      />
    </svg>
  );
}

/**
 * Přihlášení a registrace přes Google.
 *
 * U Googlu není rozdíl mezi přihlášením a registrací — účet se založí sám,
 * pokud ještě není. Proto stejné tlačítko na obou stránkách, jen s jiným
 * popiskem.
 *
 * Kam se člověk dostane potom, řeší `dal`. Bez rodiny ho `session.ts`
 * stejně pošle do průvodce, takže výchozí přehled nevadí.
 */
export function PrihlaseniGoogle({
  popisek = "Pokračovat přes Google",
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
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?dal=${encodeURIComponent(dal)}`,
        // Ať si člověk může vybrat účet, i když je někde přihlášený.
        queryParams: { prompt: "select_account" },
      },
    });

    if (potiz) {
      setBusy(false);
      setError(
        potiz.message.includes("provider is not enabled")
          ? "Přihlášení přes Google zatím není zapnuté."
          : "Přihlášení přes Google se nepovedlo. Zkus to prosím znovu.",
      );
    }
    // Při úspěchu odchází prohlížeč na Google, takže stav necháváme běžet.
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={prihlas}
        disabled={busy}
        className={cn(
          "flex h-11 w-full items-center justify-center gap-2.5 rounded-xl",
          "border border-line-strong bg-surface font-medium text-ink",
          "transition-colors hover:bg-surface-2",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
          "disabled:cursor-progress disabled:opacity-60",
        )}
      >
        {busy ? <Spinner /> : <LogoGoogle />}
        {popisek}
      </button>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}

/** Vodorovná čára s „nebo“ uprostřed. */
export function Nebo() {
  return (
    <div className="flex items-center gap-3 py-1" aria-hidden>
      <span className="h-px flex-1 bg-line" />
      <span className="text-xs font-medium uppercase tracking-wider text-ink-subtle">nebo</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
