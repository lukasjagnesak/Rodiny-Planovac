"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronRight, Clock, X } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { cn } from "@/lib/format";

/**
 * Rozjezd: pár kroků, po kterých z aplikace začne být užitek.
 *
 * Klidoo dává smysl i jednomu rodiči — spousta lidí si ho pořizuje
 * proto, že v tom chce mít sám pořádek. Druhý rodič je proto nabídka,
 * ne podmínka, a každý krok jde odmítnout. Ne každý má koho pozvat
 * a připomínat to napořád je u tohohle tématu krutost, ne aktivace.
 *
 * Karta zmizí sama, jakmile je hotovo, a jde zavřít celá. Checklist,
 * který visí na přehledu napořád, si lidé odnaučí vidět.
 */

export interface Krok {
  klic: string;
  titulek: string;
  popis: string;
  odkaz: string;
  hotovo: boolean;
  /** Rozdělaný krok — pozvánka odeslaná, ale nepřijatá. */
  ceka?: boolean;
}

export function Zaciname({ kroky }: { kroky: Krok[] }) {
  const klic = "klidoo_zaciname_skryto";
  const klicOdmitnute = "klidoo_zaciname_odmitnute";
  const [skryto, setSkryto] = React.useState(true);
  const [odmitnute, setOdmitnute] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      setSkryto(window.localStorage.getItem(klic) === "1");
      setOdmitnute(JSON.parse(window.localStorage.getItem(klicOdmitnute) ?? "[]"));
    } catch {
      setSkryto(false);
    }
  }, []);

  function odmitni(krok: string) {
    const nove = [...odmitnute, krok];
    setOdmitnute(nove);
    try {
      window.localStorage.setItem(klicOdmitnute, JSON.stringify(nove));
    } catch {
      /* soukromé okno — vrátí se to při dalším načtení, nevadí */
    }
  }

  const viditelne = kroky.filter((k) => !odmitnute.includes(k.klic));
  const hotovych = viditelne.filter((k) => k.hotovo).length;
  const vseHotovo = viditelne.length === 0 || hotovych === viditelne.length;

  if (skryto || vseHotovo) return null;

  return (
    <Card>
      <div className="flex items-center gap-3 px-4 pt-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold tracking-tight text-ink">Než se rozjedeme</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            {hotovych} z {viditelne.length} hotovo · zbytek zabere pár minut
          </p>
        </div>
        <button
          type="button"
          aria-label="Skrýt"
          onClick={() => {
            try {
              window.localStorage.setItem(klic, "1");
            } catch {
              /* soukromé okno — vrátí se to při dalším načtení, nevadí */
            }
            setSkryto(true);
          }}
          className="shrink-0 rounded-lg p-2 text-ink-subtle hover:bg-surface-2 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-4 mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2 sm:mx-5">
        <div
          className="h-full rounded-full bg-brand transition-all duration-500"
          style={{ width: `${(hotovych / Math.max(viditelne.length, 1)) * 100}%` }}
        />
      </div>

      <CardBody className="space-y-1 pt-3">
        {viditelne.map((krok) => (
          <div key={krok.klic} className="group flex items-center gap-1">
          <Link
            href={krok.odkaz}
            className={cn(
              "flex flex-1 items-center gap-3 rounded-xl px-2 py-2.5 transition-colors",
              krok.hotovo ? "opacity-60" : "hover:bg-surface-2",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                krok.hotovo
                  ? "border-success bg-success text-white"
                  : krok.ceka
                    ? "border-warning text-warning"
                    : "border-line-strong text-ink-subtle",
              )}
            >
              {krok.hotovo ? (
                <Check className="h-4 w-4" />
              ) : krok.ceka ? (
                <Clock className="h-3.5 w-3.5" />
              ) : null}
            </span>

            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block text-sm font-medium text-ink",
                  krok.hotovo && "line-through",
                )}
              >
                {krok.titulek}
              </span>
              <span className="block text-xs text-ink-subtle">{krok.popis}</span>
            </span>

            {krok.hotovo ? null : (
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-subtle" />
            )}
          </Link>

          {krok.hotovo ? null : (
            <button
              type="button"
              onClick={() => odmitni(krok.klic)}
              aria-label={`Skrýt krok ${krok.titulek}`}
              title="Tohle nepotřebuju"
              className="shrink-0 rounded-lg p-2 text-ink-subtle opacity-60 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
