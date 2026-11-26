"use client";

import * as React from "react";
import { Ikona } from "@/components/ui/ikona";
import { VyzvaRegistrace } from "@/components/web/vyzva-registrace";
import { useZakladajiciVolno } from "@/components/web/zakladajici";
import { ZAKLADAJICI } from "@/lib/tarify";
import { zmer } from "@/lib/mereni";
import { VANOCNI_TIPY_SOUHLAS } from "@/lib/marketing-souhlas";

export const PLANOVAC_PDF = "/stahnout/klidoo-vanocni-planovac.pdf";

function mist(n: number): string {
  if (n === 1) return "1 místo";
  if (n >= 2 && n <= 4) return `${n} místa`;
  return `${n} míst`;
}

export function DekujemePlanovac() {
  const volno = useZakladajiciVolno();
  // Po odeslání formuláře: „souhlasil“ (přijde potvrzení odběru), nebo
  // e-mail pro druhou šanci. Přímá návštěva neukáže ani jedno.
  const [poOdeslani, setPoOdeslani] = React.useState<"souhlasil" | "nesouhlasil" | null>(null);
  const [email, setEmail] = React.useState<string | null>(null);
  const [tipy, setTipy] = React.useState<"ceka" | "odesila" | "hotovo" | "chyba">("ceka");

  // Konverze Lead (GA4, Meta) jen po skutečném odeslání formuláře.
  React.useEffect(() => {
    try {
      if (sessionStorage.getItem("klidoo-lead") === "vanocni-planovac") {
        sessionStorage.removeItem("klidoo-lead");
        zmer("lead", undefined, { magnet: "vanocni-planovac" });
        const ulozeny = sessionStorage.getItem("klidoo-lead-email");
        setEmail(ulozeny);
        setPoOdeslani(ulozeny ? "nesouhlasil" : "souhlasil");
      }
    } catch {
      /* bez úložiště se konverze nezapočítá */
    }
  }, []);

  async function chciTipy() {
    if (!email) return;
    setTipy("odesila");
    const odpoved = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        magnet: "vanocni-planovac",
        marketing_consent: true,
        marketing_consent_version: VANOCNI_TIPY_SOUHLAS.verze,
      }),
    }).catch(() => null);
    if (odpoved?.ok) {
      setTipy("hotovo");
      zmer("lead-souhlas-dodatecne", undefined, { magnet: "vanocni-planovac" });
      try {
        sessionStorage.removeItem("klidoo-lead-email");
      } catch {
        /* nevadí */
      }
    } else setTipy("chyba");
  }

  return (
    <div className="py-12 sm:py-16">
      <div className="card p-6 text-center sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Ikona nazev="darek" size={26} />
        </span>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Plánovač je připravený
        </h1>
        <p className="mx-auto mt-2 max-w-md text-[0.95rem] leading-relaxed text-ink-muted">
          Stáhněte si ho, vyberte s druhým rodičem jeden model a pošlete návrh nejpozději do
          5. prosince.
        </p>
        <a
          href={PLANOVAC_PDF}
          download="Klidoo-vanocni-planovac.pdf"
          onClick={() => zmer("lead-stazeno", undefined, { magnet: "vanocni-planovac" })}
          className="mt-6 inline-flex h-12 items-center rounded-xl bg-brand px-6 font-semibold text-brand-ink transition-colors hover:bg-brand-hover"
        >
          Stáhnout plánovač (PDF)
        </a>
        {poOdeslani === "souhlasil" ? (
          <p className="mx-auto mt-4 max-w-md text-sm text-ink-subtle">
            Tipy vám začneme posílat, jakmile odběr potvrdíte v e-mailu, který právě odešel.
            Když nedorazí, mrkněte do složky Hromadné nebo Spam.
          </p>
        ) : null}
      </div>

      {poOdeslani === "nesouhlasil" ? (
        <div className="mt-6 card p-6 sm:p-7">
          {tipy === "hotovo" ? (
            <p className="text-[0.95rem] leading-relaxed text-ink-muted" role="status">
              Hotovo. Přišel vám e-mail, ve kterém odběr jedním klepnutím potvrdíte. Když
              nedorazí, mrkněte do složky Hromadné nebo Spam.
            </p>
          ) : (
            <>
              <h2 className="font-display text-lg font-semibold text-ink">
                Chcete k plánovači i tipy?
              </h2>
              <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-muted">
                {VANOCNI_TIPY_SOUHLAS.text}
              </p>
              <button
                type="button"
                onClick={chciTipy}
                disabled={tipy === "odesila"}
                className="mt-4 inline-flex h-11 items-center rounded-xl border border-line-strong bg-surface px-5 font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-60"
              >
                {tipy === "odesila" ? "Odesílám…" : "Ano, pošlete mi tipy"}
              </button>
              {tipy === "chyba" ? (
                <p className="mt-2 text-sm text-danger">Nepovedlo se. Zkuste to prosím znovu.</p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl bg-vyzva p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold tracking-tight text-vyzva-ink sm:text-2xl">
          Plán v telefonu obou rodičů
        </h2>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-[var(--vyzva-ink-muted)]">
          V Klidoo uvidíte domluvené Vánoce oba: u každé předávky je napsané, kdo jede, den
          předem přijde připomínka a výdaje za dárky se rozdělí samy. Funguje, i když ho zatím
          používáte jen vy.
          {ZAKLADAJICI.aktivni && typeof volno === "number" && volno > 0
            ? ` Prvních ${ZAKLADAJICI.mist} rodin má rok zdarma, bez karty — zbývá ${mist(volno)}.`
            : null}
        </p>
        <VyzvaRegistrace
          stranka="vanocni-planovac"
          misto="dekujeme"
          className="mt-5 inline-flex h-12 items-center rounded-xl bg-vyzva-btn px-6 font-semibold text-[var(--vyzva-btn-ink)] transition-all hover:brightness-110"
        >
          Založit rodinu zdarma
        </VyzvaRegistrace>
      </div>
    </div>
  );
}
