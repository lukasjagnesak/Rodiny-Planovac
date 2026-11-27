"use client";

import * as React from "react";
import { VyzvaRegistrace } from "@/components/web/vyzva-registrace";
import { useZakladajiciVolno } from "@/components/web/zakladajici";
import { ZAKLADAJICI } from "@/lib/tarify";
import { zmer } from "@/lib/mereni";
import { cn } from "@/lib/format";

/** Stálá adresa PDF — odkazuje na ni i zpráva z Instagramu. */
export const PLANOVAC_PDF = "/stahnout/klidoo-vanocni-planovac.pdf";

/** Tlačítko na stažení plánovače. Stažení se měří (lead-stazeno). */
export function StahnoutPlanovac({ misto, className }: { misto: string; className?: string }) {
  return (
    <a
      href={PLANOVAC_PDF}
      download="Klidoo-vanocni-planovac.pdf"
      onClick={() => zmer("lead-stazeno", undefined, { magnet: "vanocni-planovac", placement: misto })}
      className={cn(
        "inline-flex h-12 items-center justify-center rounded-xl bg-brand px-6 font-semibold text-brand-ink transition-colors hover:bg-brand-hover",
        className,
      )}
    >
      Stáhnout plánovač (PDF)
    </a>
  );
}

function mist(n: number): string {
  if (n === 1) return "1 místo";
  if (n >= 2 && n <= 4) return `${n} místa`;
  return `${n} míst`;
}

/** Druhá nabídka: plán v telefonu obou rodičů. Počet míst živě z databáze. */
export function NabidkaKlidoo({ misto }: { misto: string }) {
  const volno = useZakladajiciVolno();
  return (
    <div className="my-10 rounded-2xl bg-vyzva p-6 sm:p-8">
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
        misto={misto}
        className="mt-5 inline-flex h-12 items-center rounded-xl bg-vyzva-btn px-6 font-semibold text-[var(--vyzva-btn-ink)] transition-all hover:brightness-110"
      >
        Založit rodinu zdarma
      </VyzvaRegistrace>
    </div>
  );
}
