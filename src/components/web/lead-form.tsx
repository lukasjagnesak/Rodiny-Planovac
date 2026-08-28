"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/format";
import { zapamatujPuvod } from "@/lib/atribuce";

/**
 * Sběr kontaktu na veřejném webu.
 *
 * Materiál nikam neposíláme e-mailem — na to zatím není odesílatel a slíbit
 * něco, co nedorazí, je horší než nesbírat nic. Místo toho se po odeslání
 * otevře přímo tady na webu; e-mail slouží k tomu, abychom se ozvali, až
 * bude co říct.
 */

export interface LeadFormProps {
  /** Za co člověk e-mail nechává — rozlišuje kanály ve statistikách. */
  magnet: string;
  nadpis: string;
  popis: string;
  tlacitko: string;
  /** Věta po odeslání. */
  hotovo: string;
  /** Kam vede materiál, který se po odeslání zpřístupní. */
  odkaz?: { href: string; popisek: string };
  /** Partnerský formulář sbírá i jméno a organizaci. */
  partner?: boolean;
  /** Tmavý blok se hodí doprostřed článku, světlý na stránku s formulářem. */
  varianta?: "tmavy" | "svetly";
  id?: string;
}

export function LeadForm({
  magnet,
  nadpis,
  popis,
  tlacitko,
  hotovo,
  odkaz,
  partner = false,
  varianta = "tmavy",
  id,
}: LeadFormProps) {
  const [stav, setStav] = React.useState<"ceka" | "odesila" | "hotovo">("ceka");
  const [chyba, setChyba] = React.useState<string | null>(null);
  const tmavy = varianta === "tmavy";

  async function odesli(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (stav === "odesila") return;

    const form = event.currentTarget;
    const data = new FormData(form);

    setStav("odesila");
    setChyba(null);

    try {
      const odpoved = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          magnet,
          email: data.get("email"),
          jmeno: data.get("jmeno"),
          organizace: data.get("organizace"),
          telefon: data.get("telefon"),
          zprava: data.get("zprava"),
          // Návnada pro roboty; člověk ji nevidí.
          web: data.get("web"),
          ...zapamatujPuvod(),
        }),
      });

      if (!odpoved.ok) {
        const telo = await odpoved.json().catch(() => null);
        throw new Error(telo?.error ?? "Odeslání se nepovedlo.");
      }

      setStav("hotovo");
    } catch (potiz) {
      setStav("ceka");
      setChyba(
        potiz instanceof Error
          ? potiz.message
          : "Odeslání se nepovedlo. Zkus to prosím znovu.",
      );
    }
  }

  const poleTridy = cn(
    "w-full min-w-0 rounded-xl px-3.5 py-3 text-ink placeholder:text-ink-subtle",
    "border transition-colors focus:outline-none focus:ring-2",
    tmavy
      ? "border-transparent bg-surface focus:ring-vyzva-btn"
      : "border-line-strong bg-surface focus:border-brand focus:ring-brand/25",
  );

  return (
    <div id={id} className={cn("my-10 rounded-2xl p-6 sm:p-7", tmavy ? "bg-vyzva" : "card")}>
      <h3
        className={cn(
          "font-display text-xl font-semibold tracking-tight sm:text-2xl",
          tmavy ? "text-vyzva-ink" : "text-ink",
        )}
      >
        {nadpis}
      </h3>

      {stav === "hotovo" ? (
        <div className="mt-3 space-y-4">
          <p
            className={cn(
              "text-[0.95rem]",
              tmavy ? "text-[var(--vyzva-ink-muted)]" : "text-ink-muted",
            )}
          >
            {hotovo}
          </p>
          {odkaz ? (
            <Link
              href={odkaz.href}
              className={cn(
                "inline-flex h-11 items-center rounded-xl px-5 font-medium",
                tmavy
                  ? "bg-vyzva-btn text-[var(--vyzva-btn-ink)] hover:brightness-110"
                  : "bg-brand text-brand-ink hover:bg-brand-hover",
              )}
            >
              {odkaz.popisek}
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <p
            className={cn(
              "mt-2 text-[0.95rem]",
              tmavy ? "text-[var(--vyzva-ink-muted)]" : "text-ink-muted",
            )}
          >
            {popis}
          </p>

          <form onSubmit={odesli} className="mt-5 space-y-2.5" noValidate={false}>
            {partner ? (
              <div className="grid gap-2.5 sm:grid-cols-2">
                <input
                  name="jmeno"
                  type="text"
                  required
                  placeholder="Jméno a příjmení"
                  autoComplete="name"
                  className={poleTridy}
                />
                <input
                  name="organizace"
                  type="text"
                  placeholder="Kancelář nebo město"
                  autoComplete="organization"
                  className={poleTridy}
                />
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2.5">
              <input
                name="email"
                type="email"
                required
                placeholder="vas@email.cz"
                autoComplete="email"
                aria-label="Váš e-mail"
                className={cn(poleTridy, "flex-1 basis-56")}
              />
              <button
                type="submit"
                disabled={stav === "odesila"}
                className={cn(
                  "h-[3.125rem] shrink-0 rounded-xl px-5 font-semibold transition-all",
                  "disabled:cursor-progress disabled:opacity-60",
                  tmavy
                    ? "bg-vyzva-btn text-[var(--vyzva-btn-ink)] hover:brightness-110"
                    : "bg-brand text-brand-ink hover:bg-brand-hover",
                )}
              >
                {stav === "odesila" ? "Odesílám…" : tlacitko}
              </button>
            </div>

            {/* Návnada pro roboty. Skrytá před lidmi i odečítačkami. */}
            <input
              type="text"
              name="web"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute left-[-9999px] h-px w-px opacity-0"
            />

            {chyba ? (
              <p className={cn("text-sm", tmavy ? "text-vyzva-ink" : "text-danger")}>
                {chyba}
              </p>
            ) : null}

            <p
              className={cn(
                "pt-1 text-xs",
                tmavy ? "text-[var(--vyzva-ink-muted)]" : "text-ink-subtle",
              )}
            >
              Kontakt použijeme jen k tomu, kvůli čemu jsi ho nechal. Odhlášení jedním klikem.{" "}
              <Link
                href="/zasady-ochrany-osobnich-udaju"
                className={cn("underline", tmavy ? "text-vyzva-ink" : "text-ink-muted")}
              >
                Zásady ochrany osobních údajů
              </Link>
              .
            </p>
          </form>
        </>
      )}
    </div>
  );
}
