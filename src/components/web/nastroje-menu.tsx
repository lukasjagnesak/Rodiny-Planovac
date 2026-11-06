"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Ikona } from "@/components/ui/ikona";
import type { NazevIkony } from "@/lib/ikony";
import { cn } from "@/lib/format";

export interface Nastroj {
  href: string;
  popisek: string;
  popis: string;
  ikona: NazevIkony;
}

/**
 * Rozbalovací „Nástroje“ v hlavičce. Ovládá se myší i klávesnicí:
 * Enter/mezerník otevře, Escape a klik mimo zavřou a vrátí fokus.
 */
export function NastrojeMenu({ nastroje }: { nastroje: Nastroj[] }) {
  const [otevreno, setOtevreno] = React.useState(false);
  const obal = React.useRef<HTMLDivElement>(null);
  const tlacitko = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!otevreno) return;
    const mimo = (e: MouseEvent) => {
      if (!obal.current?.contains(e.target as Node)) setOtevreno(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOtevreno(false);
        tlacitko.current?.focus();
      }
    };
    document.addEventListener("mousedown", mimo);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", mimo);
      document.removeEventListener("keydown", esc);
    };
  }, [otevreno]);

  return (
    <div ref={obal} className="relative">
      <button
        ref={tlacitko}
        type="button"
        aria-expanded={otevreno}
        aria-controls="nastroje-panel"
        onClick={() => setOtevreno((o) => !o)}
        className="inline-flex items-center gap-1 rounded-lg text-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        Nástroje
        <ChevronDown className={cn("h-4 w-4 transition-transform", otevreno && "rotate-180")} aria-hidden />
      </button>
      {otevreno ? (
        <div
          id="nastroje-panel"
          className="absolute left-1/2 top-full z-50 mt-3 w-[22rem] -translate-x-1/2 rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow-pop)]"
        >
          <ul>
            {nastroje.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  onClick={() => setOtevreno(false)}
                  className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <Ikona nazev={n.ikona} size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{n.popisek}</span>
                    <span className="block text-[0.8125rem] leading-snug text-ink-muted">{n.popis}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
