import * as React from "react";
import { cn, contrastInk, initials, withAlpha } from "@/lib/format";

export function Badge({
  children,
  color,
  variant = "soft",
  className,
}: {
  children: React.ReactNode;
  color?: string;
  variant?: "soft" | "solid" | "outline";
  className?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-medium whitespace-nowrap";

  if (!color) {
    return (
      <span className={cn(base, "bg-surface-2 text-ink-muted border border-line", className)}>
        {children}
      </span>
    );
  }

  const style: React.CSSProperties =
    variant === "solid"
      ? { backgroundColor: color, color: contrastInk(color) }
      : variant === "outline"
        ? { borderColor: color, color, borderWidth: 1 }
        : { backgroundColor: withAlpha(color, 0.14), color };

  return (
    <span className={cn(base, className)} style={style}>
      {children}
    </span>
  );
}

/** Barevná tečka — legenda kalendáře, seznam dětí. */
export function Dot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  );
}

export function Avatar({
  name,
  color = "#5b6470",
  src,
  size = 36,
  className,
}: {
  name: string;
  color?: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        color: contrastInk(color),
        fontSize: size * 0.36,
      }}
    >
      {initials(name)}
    </span>
  );
}
