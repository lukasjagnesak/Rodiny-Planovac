"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { FORMULACE_CLANEK, FORMULACE_KRATKA, FORMULACE_UPOZORNENI } from "@/lib/formulace";

/**
 * Formulace do dohody s tlačítkem „Zkopírovat".
 *
 * Mediátor ani advokát nebude text přepisovat z obrazovky; kopie do
 * schránky je to, co rozhoduje, jestli se do dohody opravdu dostane.
 */
export function Formulace({ id }: { id?: string }) {
  const [verze, setVerze] = React.useState<"clanek" | "kratka">("clanek");
  const [zkopirovano, setZkopirovano] = React.useState(false);
  const text = verze === "clanek" ? FORMULACE_CLANEK : FORMULACE_KRATKA;

  async function kopiruj() {
    try {
      await navigator.clipboard.writeText(text);
      setZkopirovano(true);
      setTimeout(() => setZkopirovano(false), 2500);
    } catch {
      setZkopirovano(false);
    }
  }

  return (
    <section id={id} className="my-8 rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        {(
          [
            ["clanek", "Celý článek"],
            ["kratka", "Jedna věta"],
          ] as const
        ).map(([hodnota, popisek]) => (
          <button
            key={hodnota}
            type="button"
            onClick={() => setVerze(hodnota)}
            aria-pressed={verze === hodnota}
            className={
              verze === hodnota
                ? "rounded-lg bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand"
                : "rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted hover:text-ink"
            }
          >
            {popisek}
          </button>
        ))}
        <button
          type="button"
          onClick={kopiruj}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-hover"
        >
          {zkopirovano ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {zkopirovano ? "Zkopírováno" : "Zkopírovat"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap px-4 py-4 font-sans text-[0.9rem] leading-relaxed text-ink">
        {text}
      </pre>
      <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-ink-subtle">
        {FORMULACE_UPOZORNENI}
      </p>
    </section>
  );
}
