"use client";

import * as React from "react";
import { Ikona } from "@/components/ui/ikona";
import { VyzvaRegistrace } from "@/components/web/vyzva-registrace";
import { useZakladajiciVolno } from "@/components/web/zakladajici";
import { ZAKLADAJICI } from "@/lib/tarify";
import { zmer } from "@/lib/mereni";

export const PLANOVAC_PDF = "/stahnout/klidoo-vanocni-planovac.pdf";

function mist(n: number): string {
  if (n === 1) return "1 místo";
  if (n >= 2 && n <= 4) return `${n} místa`;
  return `${n} míst`;
}

export function DekujemePlanovac() {
  const volno = useZakladajiciVolno();

  // Konverze Lead (GA4, Meta) jen po skutečném odeslání formuláře.
  React.useEffect(() => {
    try {
      if (sessionStorage.getItem("klidoo-lead") === "vanocni-planovac") {
        sessionStorage.removeItem("klidoo-lead");
        zmer("lead", undefined, { magnet: "vanocni-planovac" });
      }
    } catch {
      /* bez úložiště se konverze nezapočítá */
    }
  }, []);

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
        <p className="mx-auto mt-4 max-w-md text-sm text-ink-subtle">
          Zaškrtli jste odběr novinek? Přijde vám e-mail, ve kterém ho jedním klepnutím
          potvrdíte. Když nedorazí, mrkněte do složky Hromadné nebo Spam.
        </p>
      </div>

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
