"use client";

import Link from "next/link";
import { zmer } from "@/lib/mereni";

/**
 * Odkaz na registraci, u kterého se měří, odkud se kliklo
 * (registration_cta_click). Parametry jsou jen typ stránky a místo na
 * ní — nikdy nic o člověku.
 */
export function VyzvaRegistrace({
  stranka,
  misto,
  href = "/registrace",
  className,
  children,
}: {
  /** Typ stránky: homepage, cenik, jak-funguje, o-klidoo, hlavicka… */
  stranka: string;
  /** Místo na stránce: hero, kroky, cena, zaver… */
  misto: string;
  href?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={() => zmer("registrace-cta", undefined, { page_type: stranka, placement: misto })}
      className={className}
    >
      {children}
    </Link>
  );
}

/** Hlavní tlačítko webu — jedna barva a jeden tvar napříč celým funnelem. */
export const TLACITKO_HLAVNI =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 font-semibold text-brand-ink transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2";

/** Vedlejší akce — obrys, nikdy druhé plné tlačítko vedle hlavního. */
export const TLACITKO_VEDLEJSI =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-6 font-medium text-ink transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";
