"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/format";
import { ZAKLADAJICI, ZKUSEBNI_DNI } from "@/lib/tarify";

/** Odpověď `/api/zakladajici`, sdílená všemi výskyty na stránce. */
let dotaz: Promise<number | null> | null = null;
function nactiVolno(): Promise<number | null> {
  dotaz ??= fetch("/api/zakladajici")
    .then((r) => r.json() as Promise<{ volno: number | null }>)
    .then((d) => d.volno)
    .catch(() => null);
  return dotaz;
}

/** Kolik míst zbývá; `undefined` = ještě se načítá, `null` = nevíme. */
export function useZakladajiciVolno(): number | null | undefined {
  const [volno, setVolno] = React.useState<number | null | undefined>(undefined);
  React.useEffect(() => {
    if (!ZAKLADAJICI.aktivni) return setVolno(0);
    let zije = true;
    nactiVolno().then((v) => zije && setVolno(v));
    return () => {
      zije = false;
    };
  }, []);
  return volno;
}

function mist(pocet: number): string {
  if (pocet === 1) return "1 místo";
  if (pocet >= 2 && pocet <= 4) return `${pocet} místa`;
  return `${pocet} míst`;
}

/**
 * Pruh s nabídkou pro zakládající rodiny.
 *
 * Proč tak vidět: lidé registraci nedokončují ze strachu, že to bude
 * něco stát. „Rok zdarma, bez karty" ten strach bere rovnou. Počet
 * volných míst je skutečný (z databáze) — vymyšlený odpočet by byl lež
 * a na téhle cílovce, která čte každé slovo podezíravě, i hloupost.
 *
 * Když jsou místa pryč, pruh zmizí a zbytek stránky mluví o běžném
 * zkušebním období.
 */
export function ZakladajiciPruh({
  className,
  kompaktni = false,
}: {
  className?: string;
  /** Jeden řádek — na stránce, kde pod nadpisem hned začíná nástroj. */
  kompaktni?: boolean;
}) {
  const volno = useZakladajiciVolno();
  if (!ZAKLADAJICI.aktivni || volno === 0) return null;

  if (kompaktni) {
    return (
      <p
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-sm text-ink",
          className,
        )}
      >
        <Sparkles className="h-4 w-4 shrink-0 text-brand" aria-hidden />
        <span>
          <strong className="font-semibold">Prvních {ZAKLADAJICI.mist} rodin rok zdarma</strong>
          {typeof volno === "number" ? ` · zbývá ${mist(volno)}` : null}
        </span>
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand-soft px-4 py-3.5",
        className,
      )}
    >
      <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
      <p className="text-[0.95rem] leading-relaxed text-ink">
        <strong className="font-semibold">
          Zakládající rodiny: prvních {ZAKLADAJICI.mist} rodin má rok zdarma.
        </strong>{" "}
        <span className="text-ink-muted">
          Bez karty, všechny funkce, druhý rodič taky zdarma.
          {typeof volno === "number" ? ` Zbývá ${mist(volno)}.` : null}
        </span>
      </p>
    </div>
  );
}

/**
 * Krátká věta pod tlačítkem: co člověk dostane. Když jsou místa
 * zakládajících rodin pryč, vrátí se k běžnému zkušebnímu období.
 */
export function ZdarmaVeta({
  zbytek,
  vedlePruhu = false,
}: {
  zbytek?: React.ReactNode;
  /** Nad větou je `ZakladajiciPruh` — rok zdarma neopakovat. */
  vedlePruhu?: boolean;
}) {
  const volno = useZakladajiciVolno();
  const rok = ZAKLADAJICI.aktivni && volno !== 0;
  return (
    <>
      {rok && vedlePruhu
        ? "Bez karty, všechny funkce."
        : rok
        ? `Prvních ${ZAKLADAJICI.mist} rodin má rok zdarma${typeof volno === "number" ? ` (zbývá ${mist(volno)})` : ""}, bez karty.`
        : `${ZKUSEBNI_DNI} dní zdarma se všemi funkcemi, bez karty.`}
      {zbytek}
    </>
  );
}
