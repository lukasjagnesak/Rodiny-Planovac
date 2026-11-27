import * as React from "react";
import { cn } from "@/lib/format";
import { ZNACKA } from "@/lib/brand";

/**
 * Značka Klidoo.
 *
 * Dvě kolečka, která se překrývají — dva domovy a dítě uprostřed, kde
 * se prolínají. Překryv vzniká prolnutím barev, takže třetí odstín není
 * potřeba dopisovat a drží se sám, i když se barvy změní. Způsob prolnutí
 * se mění podle režimu: na světlém podkladu ztmavuje, na tmavém zesvětluje.
 */
export function Znak({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 80"
      role="img"
      aria-label={ZNACKA}
      className={cn("shrink-0", className)}
    >
      <circle cx="46" cy="40" r="34" fill="var(--parent-a)" />
      <circle
        cx="74"
        cy="40"
        r="34"
        fill="var(--parent-b)"
        style={{ mixBlendMode: "var(--znak-prolnuti)" as React.CSSProperties["mixBlendMode"] }}
      />
    </svg>
  );
}

/** Znak i nápis vedle sebe — hlavička aplikace, přihlášení, veřejný web. */
export function Logo({
  size = 32,
  className,
  bezNapisu = false,
}: {
  size?: number;
  className?: string;
  bezNapisu?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Znak size={size} />
      {bezNapisu ? null : (
        <span
          className="font-display font-semibold tracking-tight text-ink"
          style={{ fontSize: size * 0.62 }}
        >
          {ZNACKA}
        </span>
      )}
    </span>
  );
}
