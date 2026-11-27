"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/format";
import { zmer } from "@/lib/mereni";
import type { SekceChecklistu } from "@/lib/checklist";

/**
 * Checklist, který se dá odškrtávat přímo na webu.
 *
 * Postup se ukládá jen do prohlížeče (localStorage) — bez účtu a bez
 * serveru. Klíčem je text bodu, ne pořadí: když se bod přidá doprostřed,
 * ostatní odškrtnuté zůstanou odškrtnuté.
 *
 * Ke každému bodu jde volitelně určit, kdo ho zařídí. Na tom se rodiče
 * v praxi zaseknou víc než na samotném seznamu.
 */

export const CHECKLIST_PDF = "/api/checklist";

const KLIC = "klidoo-checklist-30-dni";

type Kdo = "ja" | "druhy" | "spolecne";
const KDO: { hodnota: Kdo; popisek: string }[] = [
  { hodnota: "ja", popisek: "Já" },
  { hodnota: "druhy", popisek: "Druhý rodič" },
  { hodnota: "spolecne", popisek: "Společně" },
];

interface StavBodu {
  hotovo?: boolean;
  kdo?: Kdo;
}
type Stav = Record<string, StavBodu>;

function nacti(): Stav {
  try {
    const surove = window.localStorage.getItem(KLIC);
    const data: unknown = surove ? JSON.parse(surove) : {};
    return data && typeof data === "object" ? (data as Stav) : {};
  } catch {
    return {};
  }
}

function uloz(stav: Stav): void {
  try {
    window.localStorage.setItem(KLIC, JSON.stringify(stav));
  } catch {
    // Anonymní okno nebo plné úložiště — checklist funguje dál, jen si nepamatuje.
  }
}

/** Tlačítko na stažení PDF. Stažení se měří (lead-stazeno). */
export function StahnoutChecklist({
  misto,
  className,
  svetle = false,
}: {
  misto: string;
  className?: string;
  svetle?: boolean;
}) {
  return (
    <a
      href={CHECKLIST_PDF}
      download="Klidoo-checklist-prvnich-30-dni.pdf"
      onClick={() => zmer("lead-stazeno", undefined, { magnet: "checklist-30-dni", placement: misto })}
      className={cn(
        "inline-flex h-12 items-center justify-center rounded-xl px-6 font-semibold transition-colors",
        svetle
          ? "border border-line-strong bg-surface text-ink hover:bg-canvas"
          : "bg-brand text-brand-ink hover:bg-brand-hover",
        className,
      )}
    >
      Stáhnout checklist (PDF)
    </a>
  );
}

export function ChecklistInteraktivni({ sekce }: { sekce: SekceChecklistu[] }) {
  const [stav, setStav] = React.useState<Stav>({});
  const [nacteno, setNacteno] = React.useState(false);

  React.useEffect(() => {
    setStav(nacti());
    setNacteno(true);
  }, []);

  const zmen = React.useCallback((bod: string, zmena: StavBodu) => {
    setStav((puvodni) => {
      const dalsi = { ...puvodni, [bod]: { ...puvodni[bod], ...zmena } };
      uloz(dalsi);
      return dalsi;
    });
  }, []);

  const vsechny = sekce.flatMap((s) => s.body);
  const celkem = vsechny.length;
  const hotovo = vsechny.filter((b) => stav[b]?.hotovo).length;
  const podil = celkem ? Math.round((hotovo / celkem) * 100) : 0;
  const vse = nacteno && hotovo === celkem;

  function zacitZnovu() {
    if (!window.confirm("Smazat odškrtnuté body i rozdělení, kdo co zařídí?")) return;
    setStav({});
    uloz({});
  }

  return (
    <div>
      {/* Ukazatel postupu zůstává nahoře při posouvání. */}
      <div className="no-print sticky top-16 z-10 -mx-4 mb-6 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-ink" aria-live="polite">
            {hotovo} z {celkem} hotovo
          </p>
          {hotovo > 0 ? (
            <button
              type="button"
              onClick={zacitZnovu}
              className="text-sm text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Začít znovu
            </button>
          ) : (
            <p className="text-sm text-ink-muted">Odškrtávejte rovnou tady</p>
          )}
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={celkem}
          aria-valuenow={hotovo}
          aria-label="Postup checklistem"
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-300"
            style={{ width: `${podil}%` }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {sekce.map(({ nadpis, body }) => {
          const vSekci = body.filter((b) => stav[b]?.hotovo).length;
          const sekceHotova = vSekci === body.length;
          return (
            <section key={nadpis} className="card p-5 sm:p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-ink">{nadpis}</h2>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    sekceHotova ? "bg-brand text-brand-ink" : "bg-canvas text-ink-muted",
                  )}
                >
                  {sekceHotova ? "Hotovo" : `${vSekci} / ${body.length}`}
                </span>
              </div>
              <ul className="mt-4 space-y-2">
                {body.map((bod) => (
                  <Bod
                    key={bod}
                    text={bod}
                    stav={stav[bod] ?? {}}
                    onZmena={(zmena) => zmen(bod, zmena)}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {vse ? (
        <div className="my-8 rounded-2xl border border-brand bg-surface p-6 text-center">
          <p className="font-display text-xl font-semibold text-ink">Máte hotovo všech {celkem} bodů.</p>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-muted">
            Základ stojí. Teď přijde provoz, který se opakuje každý týden — předávky, kroužky
            a výdaje.
          </p>
          <Link
            href="/registrace"
            className="mt-4 inline-flex h-12 items-center rounded-xl bg-brand px-6 font-semibold text-brand-ink transition-colors hover:bg-brand-hover"
          >
            Přenést provoz do Klidoo
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function Bod({
  text,
  stav,
  onZmena,
}: {
  text: string;
  stav: StavBodu;
  onZmena: (zmena: StavBodu) => void;
}) {
  const id = React.useId();
  const hotovo = Boolean(stav.hotovo);
  return (
    <li className={cn("rounded-xl px-2 py-2 transition-colors sm:px-3", hotovo && "bg-canvas")}>
      <div className="flex gap-3">
        <input
          id={id}
          type="checkbox"
          checked={hotovo}
          onChange={(e) => onZmena({ hotovo: e.target.checked })}
          className="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded-[5px] accent-[var(--color-brand)]"
        />
        <label
          htmlFor={id}
          className={cn(
            "cursor-pointer text-[0.95rem] leading-relaxed transition-colors",
            hotovo ? "text-ink-subtle line-through decoration-line-strong" : "text-ink-muted",
          )}
        >
          {text}
        </label>
      </div>
      <div className="no-print mt-2 flex flex-wrap items-center gap-1.5 pl-8" role="group" aria-label="Kdo to zařídí">
        <span className="mr-1 text-xs text-ink-subtle">Zařídí:</span>
        {KDO.map(({ hodnota, popisek }) => {
          const vybrano = stav.kdo === hodnota;
          return (
            <button
              key={hodnota}
              type="button"
              aria-pressed={vybrano}
              onClick={() => onZmena({ kdo: vybrano ? undefined : hodnota })}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                vybrano
                  ? "border-brand bg-brand text-brand-ink"
                  : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {popisek}
            </button>
          );
        })}
      </div>
    </li>
  );
}
