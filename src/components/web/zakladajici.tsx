"use client";

import * as React from "react";
import { Sparkles, Users } from "lucide-react";
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

/**
 * Velký blok nabídky — nahoře na registraci a na ceníku.
 *
 * Lidé z Instagramu a reklam jdou rovnou na registraci. Kdo tam uvidí
 * nejdřív formulář a cenu, odejde dřív, než dočte, že platit nebude.
 * Proto je „rok zdarma" první a největší věc na stránce a hned pod ním
 * skutečný počet volných míst z databáze.
 */
export function ZakladajiciNabidka({ className }: { className?: string }) {
  const volno = useZakladajiciVolno();
  if (!ZAKLADAJICI.aktivni || volno === 0) return null;
  const obsazeno = typeof volno === "number" ? ZAKLADAJICI.mist - volno : null;

  return (
    <div
      className={cn("rounded-2xl bg-brand px-5 py-5 text-center text-brand-ink sm:px-6", className)}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-90">
        Zakládající rodiny
      </p>
      <p className="mt-1 font-display text-[2.5rem] font-bold leading-none tracking-tight sm:text-5xl">
        Rok zdarma
      </p>
      <p className="mt-2 text-base font-medium">
        pro prvních {ZAKLADAJICI.mist} rodin · bez karty · všechny funkce
      </p>

      {obsazeno !== null && typeof volno === "number" ? (
        <div className="mx-auto mt-4 max-w-xs">
          <div
            className="h-2 overflow-hidden rounded-full bg-white/25"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={ZAKLADAJICI.mist}
            aria-valuenow={obsazeno}
            aria-label="Obsazená místa zakládajících rodin"
          >
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${Math.max(4, (obsazeno / ZAKLADAJICI.mist) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-sm font-semibold">
            Zbývá {mist(volno)} z {ZAKLADAJICI.mist}
          </p>
        </div>
      ) : null}

      <p className="mt-3 text-sm opacity-90">
        Teď neplatíte nic. Po roce se rozhodnete sami, nic se samo nestrhne.
      </p>
    </div>
  );
}

/**
 * Věta k ceně v ceníku: kdo přišel z reklamy na „rok zdarma", nesmí
 * u 129 Kč znejistět, jestli se to týká jeho.
 */
export function ZakladajiciUCeny() {
  const volno = useZakladajiciVolno();
  if (!ZAKLADAJICI.aktivni || volno === 0) return null;
  return (
    <p className="mt-2 inline-flex rounded-pill bg-brand-soft px-2.5 py-1 text-sm font-semibold text-brand">
      Zakládající rodiny: první rok za 0&nbsp;Kč
    </p>
  );
}

/**
 * Nabídka na registraci: krátká karta podle návrhu „CRO" — nadpis,
 * jedna věta s cenou a skutečný počet volných míst z databáze. Žádný
 * odpočet ani časovač: počet míst je jediná naléhavost a je pravdivá.
 *
 * Když místa dojdou (nebo se nabídka vypne), karta sama ukáže běžné
 * zkušební období — reklamy vedoucí sem dál dávají smysl.
 */
export function ZakladajiciPromo({ className }: { className?: string }) {
  const volno = useZakladajiciVolno();
  const rok = ZAKLADAJICI.aktivni && volno !== 0;

  return (
    <div className={cn("rounded-2xl border border-brand/25 bg-brand-soft px-4 py-3", className)}>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-brand">
        {rok ? "Nabídka pro zakládající rodiny" : "Vyzkoušení zdarma"}
      </p>
      <p className="mt-0.5 font-display text-2xl font-semibold leading-tight tracking-tight text-ink">
        {rok ? "První rok zdarma" : `${ZKUSEBNI_DNI} dní zdarma`}
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        {rok ? "0 Kč na 12 měsíců" : "Všechny funkce"} · bez platební karty
      </p>
      {/* Ukazatel naplnění ze skutečného počtu v databázi. Místo pro něj
          je vyhrazené i během načítání, ať stránka neposkočí (CLS). */}
      {rok ? <UkazatelMist volno={volno} /> : null}
    </div>
  );
}

/**
 * Kolik z 50 zakládajících rodin je zaregistrovaných — zelený pruh,
 * jehož konec jemně září. Záře je jen ozdoba konce pruhu; s vypnutými
 * animacemi v systému (prefers-reduced-motion) zůstane klidná.
 */
function UkazatelMist({ volno }: { volno: number | null | undefined }) {
  const znamo = typeof volno === "number";
  const obsazeno = znamo ? ZAKLADAJICI.mist - volno : 0;
  const podil = znamo ? Math.min(100, Math.max(3, (obsazeno / ZAKLADAJICI.mist) * 100)) : 0;

  return (
    <div className="mt-2.5 min-h-[2.75rem]">
      {znamo ? (
        <>
          <div
            className="relative h-2.5 rounded-full bg-brand/15"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={ZAKLADAJICI.mist}
            aria-valuenow={obsazeno}
            aria-label={`Zaregistrováno ${obsazeno} z ${ZAKLADAJICI.mist} zakládajících rodin`}
          >
            <div className="relative h-full rounded-full bg-brand" style={{ width: `${podil}%` }}>
              <span aria-hidden className="zare-svit" />
              <span aria-hidden className="zare-konec" />
            </div>
          </div>
          <p className="mt-1.5 flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-1.5 font-medium text-ink">
              <Users className="h-4 w-4 text-brand" aria-hidden />
              {obsazeno} z {ZAKLADAJICI.mist} rodin
            </span>
            <span className="text-ink-muted">zbývá {mist(volno)}</span>
          </p>
        </>
      ) : null}
    </div>
  );
}
