"use client";

import * as React from "react";
import { cn } from "@/lib/format";

/** Vodorovný přepínač voleb — filtr období, výběr dítěte. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1",
        className,
      )}
      role="tablist"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
              active
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {icon ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          {icon}
        </div>
      ) : null}
      <div>
        <p className="font-semibold text-ink">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** Výběr barvy z pevné palety. */
export function ColorPicker({
  value,
  onChange,
  palette,
}: {
  value: string;
  onChange: (color: string) => void;
  palette: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {palette.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Barva ${c}`}
          aria-pressed={value.toLowerCase() === c.toLowerCase()}
          className={cn(
            "h-9 w-9 rounded-full transition-transform",
            value.toLowerCase() === c.toLowerCase()
              ? "scale-110 ring-2 ring-ink ring-offset-2 ring-offset-surface"
              : "hover:scale-105",
          )}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

/** Jednoduchý vodorovný pruh pro poměr dvou hodnot. */
export function SplitBar({
  a,
  b,
  colorA,
  colorB,
  className,
}: {
  a: number;
  b: number;
  colorA: string;
  colorB: string;
  className?: string;
}) {
  const total = a + b;
  const pa = total > 0 ? (a / total) * 100 : 50;
  return (
    <div className={cn("flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2", className)}>
      <div style={{ width: `${pa}%`, backgroundColor: colorA }} />
      <div style={{ width: `${100 - pa}%`, backgroundColor: colorB }} />
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
      role="status"
      aria-label="Načítám"
    />
  );
}

/** Nenápadné oznámení o výsledku akce. */
export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "danger" | "warning";
  children: React.ReactNode;
}) {
  const tones = {
    info: "bg-info-soft text-info",
    success: "bg-success-soft text-success",
    danger: "bg-danger-soft text-danger",
    warning: "bg-warning-soft text-warning",
  };
  return (
    <div className={cn("rounded-xl px-3.5 py-2.5 text-sm", tones[tone])} role="status">
      {children}
    </div>
  );
}

/**
 * Text, ve kterém jsou odkazy klikatelné.
 *
 * Zprávy ze školy bývají „podrobnosti najdete na https://…" a přepisovat
 * adresu ručně je otrava. Text se jen rozseká podle adres a poskládá
 * z Reactu — žádné vkládání HTML, do kterého by šlo něco propašovat.
 */
const ADRESA = /(https?:\/\/[^\s<>"']+)/g;

/** Tečka na konci věty není součástí adresy. */
function orizniInterpunkci(url: string): [string, string] {
  const konec = url.match(/[.,;:!?)\]]+$/);
  if (!konec) return [url, ""];
  return [url.slice(0, -konec[0].length), konec[0]];
}

export function TextSOdkazy({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const casti = React.useMemo(() => text.split(ADRESA), [text]);

  return (
    <span className={className}>
      {casti.map((cast, i) => {
        // Split se zachytávající skupinou dá adresy na liché pozice.
        if (i % 2 === 0) return <React.Fragment key={i}>{cast}</React.Fragment>;

        const [url, zbytek] = orizniInterpunkci(cast);
        return (
          <React.Fragment key={i}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-brand underline underline-offset-2 hover:no-underline"
            >
              {url}
            </a>
            {zbytek}
          </React.Fragment>
        );
      })}
    </span>
  );
}
