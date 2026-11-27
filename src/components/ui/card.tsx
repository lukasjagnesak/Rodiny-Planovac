import * as React from "react";
import { cn } from "@/lib/format";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card overflow-hidden", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-4 pt-4 sm:px-5", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 sm:p-5", className)} {...props} />;
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

/** Velké číslo s popiskem — dlaždice na přehledu. */
export function StatTile({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "card relative flex flex-col justify-between gap-2 p-4",
        // Místo pro proužek, ať se o něj text neotírá.
        accent && "pl-5",
      )}
    >
      {/*
        Proužek je pilulka odsazená od okraje, ne obarvená hrana karty.
        Dřív měl `rounded-l-[inherit]`, tedy poloměr karty — jenže ten je
        16 px a proužek 4 px široký. Prohlížeč poloměr osekává na polovinu
        šířky, takže z kulatých rohů zbyly dva pixely, pravá strana zůstala
        hranatá a celé to vypadalo jako čára useknutá okrajem karty.

        Svislé odsazení je stejné jako vnitřní okraj karty, aby proužek
        začínal i končil přesně s textem.
      */}
      {accent ? (
        <span
          aria-hidden
          className="absolute inset-y-4 left-2 w-1 rounded-pill"
          style={{ backgroundColor: accent }}
        />
      ) : null}
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-subtle">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="tnum text-2xl font-semibold leading-none text-ink">{value}</div>
      {hint ? <div className="text-xs text-ink-muted">{hint}</div> : null}
    </div>
  );
}
