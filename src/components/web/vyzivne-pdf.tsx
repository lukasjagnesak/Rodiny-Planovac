"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/format";
import { zapamatujPuvod } from "@/lib/atribuce";
import { zmer } from "@/lib/mereni";
import type { VyzivneVstup } from "@/lib/vyzivne";

/**
 * Odeslání výpočtu v PDF na e-mail.
 *
 * Proč vlastní blok a ne obyčejný formulář na materiál: dokument se
 * skládá ze zadání, které má člověk zrovna naklikané, takže musí být
 * hned pod výsledkem a musí vědět, co v kalkulačce stojí. Nabídnout
 * ho až v patičce stránky znamená nabídnout ho po tom, co si výsledek
 * opsal na papír.
 *
 * Je to pravá větev rozcestí pod výsledkem: pro toho, kdo se teprve
 * domlouvá. Aplikaci by ještě nepoužil a 30 dní zkoušení by mu propadlo
 * dřív, než bude mít rozvrh — PDF mu pomůže teď a e-mail nám dovolí
 * ozvat se, až aplikaci potřebovat bude.
 *
 * Posílá se jen zadání, ne spočítaná částka — tu si server spočítá sám.
 */
export function VyzivnePdf({ vstup }: { vstup: VyzivneVstup }) {
  const [stav, setStav] = React.useState<"ceka" | "odesila" | "hotovo">("ceka");
  const [chyba, setChyba] = React.useState<string | null>(null);
  const [kam, setKam] = React.useState("");

  async function odesli(udalost: React.FormEvent<HTMLFormElement>) {
    udalost.preventDefault();
    if (stav === "odesila") return;

    const formular = udalost.currentTarget;
    const data = new FormData(formular);
    const email = String(data.get("email") ?? "").trim();

    setStav("odesila");
    setChyba(null);

    try {
      const odkud = zapamatujPuvod();
      const odpoved = await fetch("/api/vyzivne/pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          web: String(data.get("web") ?? ""),
          vypocet: vstup,
          odkud: {
            utm_source: odkud.utm_source || null,
            utm_medium: odkud.utm_medium || null,
            utm_campaign: odkud.utm_campaign || null,
            ref: odkud.ref || null,
            referrer: odkud.referrer || null,
            landing: window.location.pathname,
          },
        }),
      });

      if (!odpoved.ok) {
        const telo = await odpoved.json().catch(() => null);
        setChyba(telo?.error ?? "Odeslání se nepovedlo. Zkuste to prosím znovu.");
        setStav("ceka");
        return;
      }

      zmer("lead");
      setKam(email);
      setStav("hotovo");
    } catch {
      setChyba("Nejsme online. Zkuste to prosím znovu.");
      setStav("ceka");
    }
  }

  if (stav === "hotovo") {
    return (
      <div className="rounded-2xl border border-line bg-surface-2 p-5 sm:p-6">
        <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
          Odesláno na {kam}
        </h3>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-muted">
          PDF s výpočtem i se zadáním, ze kterého vyšel, je na cestě. Kdyby do pár
          minut nedorazilo, mrkněte do hromadné pošty nebo do spamu.
        </p>
        <p className="mt-3 text-sm text-ink-muted">
          Další krok bývá{" "}
          <Link
            href="/vzor-dohody-o-stridave-peci"
            className="font-medium text-brand underline underline-offset-4"
          >
            dohoda rodičů, kterou soud schválí
          </Link>
          . Vzor máme připravený ke stažení.
        </p>
      </div>
    );
  }

  const poleTridy = cn(
    "w-full min-w-0 rounded-xl border border-line-strong bg-surface px-3.5 py-3",
    "text-ink placeholder:text-ink-subtle transition-colors",
    "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25",
  );

  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
        Teprve se domlouváte
      </p>
      <h3 className="mt-1.5 font-display text-xl font-semibold leading-tight tracking-tight text-ink">
        Pošleme vám výpočet v PDF
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
        I se zadáním, ze kterého vyšel — k jednání s druhým rodičem nebo k advokátovi.
      </p>

      <form onSubmit={odesli} className="mt-4 flex gap-2">
        {/* Návnada pro roboty. Člověk ji nevidí, robot ji vyplní. */}
        <input
          name="web"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="vas@email.cz"
          autoComplete="email"
          aria-label="E-mail, na který výpočet poslat"
          className={cn(poleTridy, "flex-1")}
        />
        <button
          type="submit"
          disabled={stav === "odesila"}
          className={cn(
            "h-[3.125rem] shrink-0 rounded-xl border-[1.5px] border-brand px-4 font-semibold text-brand",
            "transition-colors hover:bg-brand-soft",
            "disabled:cursor-progress disabled:opacity-60",
          )}
        >
          {stav === "odesila" ? "Posílám…" : "Poslat"}
        </button>
      </form>

      {chyba ? <p className="mt-2 text-sm text-danger">{chyba}</p> : null}

      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        Příjmy se nikam neukládají, v PDF jsou jen kvůli tomu, aby bylo vidět, z čeho
        číslo vyšlo. E-mail si necháme, ať se ozveme, když se tabulka nebo soudní praxe
        změní. Odhlásit se dá jedním kliknutím.
      </p>
    </div>
  );
}
