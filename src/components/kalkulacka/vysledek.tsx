"use client";

import * as React from "react";
import { isSameMonth } from "date-fns";
import { DOW_SHORT, formatDayShort, formatMonth, relativeDayLabel } from "@/lib/dates";
import { cn } from "@/lib/format";
import { nejblizsiPredani, type PlanVstup, type VysledekPlanu } from "@/lib/kalkulacka";

export const BARVA_A = "#3f74e0";
export const BARVA_B = "#d9557a";

/** Sdílené vykreslení výsledku — používá ho kalkulačka i sdílený odkaz. */
export function Vysledek({
  vstup,
  vysledek,
}: {
  vstup: PlanVstup;
  vysledek: VysledekPlanu;
}) {
  const predani = React.useMemo(() => nejblizsiPredani(vysledek), [vysledek]);
  const mesiceKZobrazeni = vysledek.mesice.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* ── Poměr nocí za rok ────────────────────────────────── */}
      <div className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          Za dvanáct měsíců dopředu
        </p>

        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <p className="tnum text-3xl font-semibold" style={{ color: BARVA_A }}>
              {vysledek.rokNociA}
            </p>
            <p className="text-sm text-ink-muted">{vstup.jmenoA}</p>
          </div>
          <p className="pb-1 text-sm text-ink-subtle">nocí</p>
          <div className="text-right">
            <p className="tnum text-3xl font-semibold" style={{ color: BARVA_B }}>
              {vysledek.rokNociB}
            </p>
            <p className="text-sm text-ink-muted">{vstup.jmenoB}</p>
          </div>
        </div>

        <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div style={{ width: `${vysledek.procentA}%`, backgroundColor: BARVA_A }} />
          <div style={{ width: `${vysledek.procentB}%`, backgroundColor: BARVA_B }} />
        </div>
        <p className="tnum mt-1.5 flex justify-between text-xs text-ink-subtle">
          <span>{vysledek.procentA} %</span>
          <span>{vysledek.procentB} %</span>
        </p>

        {predani ? (
          <p className="mt-4 rounded-xl bg-surface-2 px-3.5 py-2.5 text-sm text-ink">
            Nejbližší předání{" "}
            <strong>
              {formatDayShort(predani.den)} ({relativeDayLabel(predani.den)})
            </strong>{" "}
            —{" "}
            <span
              className="font-medium"
              style={{ color: predani.strana === "a" ? BARVA_A : BARVA_B }}
            >
              {predani.strana === "a" ? vstup.jmenoA : vstup.jmenoB}
            </span>
          </p>
        ) : null}
      </div>

      {/* ── Kalendář na tři měsíce ───────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {mesiceKZobrazeni.map((mesic) => (
          <MesicniMrizka
            key={mesic.klic}
            zacatek={mesic.zacatek}
            dny={vysledek.dny}
            nociA={mesic.nociA}
            nociB={mesic.nociB}
          />
        ))}
      </div>

      {/* ── Rozpis po měsících ───────────────────────────────── */}
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[22rem] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-subtle">
              <th className="px-4 py-2.5 font-medium">Měsíc</th>
              <th className="px-4 py-2.5 text-right font-medium">{vstup.jmenoA}</th>
              <th className="px-4 py-2.5 text-right font-medium">{vstup.jmenoB}</th>
            </tr>
          </thead>
          <tbody>
            {vysledek.mesice.map((mesic) => (
              <tr key={mesic.klic} className="border-b border-line last:border-0">
                <td className="px-4 py-2 capitalize text-ink">{formatMonth(mesic.zacatek)}</td>
                <td className="tnum px-4 py-2 text-right" style={{ color: BARVA_A }}>
                  {mesic.nociA}
                </td>
                <td className="tnum px-4 py-2 text-right" style={{ color: BARVA_B }}>
                  {mesic.nociB}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Souvislé pobyty ──────────────────────────────────── */}
      {vysledek.bloky.length > 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            Nejbližší pobyty
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {vysledek.bloky.map((blok) => (
              <li key={blok.startKey} className="flex items-center gap-2.5 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: blok.side === "a" ? BARVA_A : BARVA_B }}
                />
                <span className="tnum text-ink">
                  {formatDayShort(blok.startKey)} – {formatDayShort(blok.endKey)}
                </span>
                <span className="text-ink-muted">
                  {blok.side === "a" ? vstup.jmenoA : vstup.jmenoB}
                </span>
                <span className="tnum ml-auto text-xs text-ink-subtle">
                  {blok.nights} {blok.nights === 1 ? "noc" : blok.nights < 5 ? "noci" : "nocí"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function MesicniMrizka({
  zacatek,
  dny,
  nociA,
  nociB,
}: {
  zacatek: Date;
  dny: VysledekPlanu["dny"];
  nociA: number;
  nociB: number;
}) {
  const vMesici = dny.filter((d) => isSameMonth(d.datum, zacatek));
  if (vMesici.length === 0) return null;

  // Prázdná místa před prvním dnem, ať měsíc začíná pod správným dnem týdne.
  const prvni = vMesici[0].datum;
  const odsazeni = (prvni.getDay() + 6) % 7;

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm font-semibold capitalize text-ink">{formatMonth(zacatek)}</p>
      <p className="tnum mt-0.5 text-xs text-ink-subtle">
        {nociA} : {nociB} nocí
      </p>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <span key={d} className="text-[10px] font-medium text-ink-subtle">
            {DOW_SHORT[d]}
          </span>
        ))}

        {Array.from({ length: odsazeni }, (_, i) => (
          <span key={`prazdno-${i}`} />
        ))}

        {vMesici.map((den) => (
          <span
            key={den.klic}
            className={cn(
              "tnum flex aspect-square items-center justify-center rounded-md text-[11px] font-medium",
              den.strana ? "text-white" : "text-ink-subtle",
            )}
            style={{
              backgroundColor:
                den.strana === "a" ? BARVA_A : den.strana === "b" ? BARVA_B : undefined,
              // Den předání dostane světlý rámeček, ať je v mřížce vidět.
              boxShadow: den.predani ? "inset 0 0 0 2px rgba(255,255,255,0.65)" : undefined,
            }}
          >
            {den.datum.getDate()}
          </span>
        ))}
      </div>
    </div>
  );
}
