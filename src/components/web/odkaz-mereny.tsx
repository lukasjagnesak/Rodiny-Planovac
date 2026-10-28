"use client";

import Link from "next/link";
import { zmer } from "@/lib/mereni";

/**
 * Odkaz, u kterého se měří klik.
 *
 * Na kalkulačce výživného jsou tři tlačítka „Vyzkoušet zdarma" a dřív
 * se měřilo jen jedno — takže „nikdo neklikl" mohlo znamenat i „klikl
 * jinde". Klik se hlásí přes `sendBeacon`, takže přežije přechod na
 * další stránku.
 */
export function OdkazMereny({
  href,
  udalost,
  className,
  children,
}: {
  href: string;
  /** Druh události; musí být v `DRUHY` v `lib/provoz.ts`, jinak ho server zahodí. */
  udalost: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} onClick={() => zmer(udalost)} className={className}>
      {children}
    </Link>
  );
}
