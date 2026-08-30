"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Eye, Users, Wallet, Sparkles } from "lucide-react";
import { Card, CardBody, CardHeader, StatTile } from "@/components/ui/card";
import { Segmented } from "@/components/ui/misc";
import { formatDayShort } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import type { Den, KrokTrychtyre, Radek } from "@/lib/provoz-souhrn";

/** V databázi jsou klíče bez diakritiky, na obrazovce patří česky. */
const NAZEV_ZARIZENI: Record<string, string> = {
  mobil: "Mobil",
  pocitac: "Počítač",
};

export function ProvozScreen({
  obdobi,
  dny,
  trychtyr,
  kanaly,
  stranky,
  zarizeni,
  zaklad,
}: {
  obdobi: number;
  dny: Den[];
  trychtyr: KrokTrychtyre[];
  kanaly: Radek[];
  stranky: Radek[];
  zarizeni: Radek[];
  zaklad: { rodin: number; platicich: number; vezkusebnim: number; leadu: number };
}) {
  const router = useRouter();

  const zobrazeni = dny.reduce((s, d) => s + d.zobrazeni, 0);
  const navstevnici = dny.reduce((s, d) => s + d.navstevnici, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Provoz</h1>
          <p className="text-sm text-ink-muted">
            Odkud lidé chodí a kam se dostanou. Bez cookies a bez třetí strany.
          </p>
        </div>
        <Segmented
          value={String(obdobi)}
          onChange={(v) => router.push(`/provoz?dny=${v}`)}
          options={[
            { value: "7", label: "7 dní" },
            { value: "30", label: "30 dní" },
            { value: "90", label: "90 dní" },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label={`Návštěvníci / ${obdobi} dní`}
          value={<span className="tnum">{formatNumber(navstevnici)}</span>}
          hint={`${formatNumber(zobrazeni)} zobrazení`}
          icon={<Eye className="h-3.5 w-3.5" />}
          accent="var(--brand)"
        />
        <StatTile
          label="Rodiny celkem"
          value={<span className="tnum">{formatNumber(zaklad.rodin)}</span>}
          hint={`${zaklad.vezkusebnim} ve zkušebním`}
          icon={<Users className="h-3.5 w-3.5" />}
          accent="var(--parent-a)"
        />
        <StatTile
          label="Platící rodiny"
          value={<span className="tnum">{formatNumber(zaklad.platicich)}</span>}
          icon={<Wallet className="h-3.5 w-3.5" />}
          accent="var(--success)"
        />
        <StatTile
          label="Kontakty z webu"
          value={<span className="tnum">{formatNumber(zaklad.leadu)}</span>}
          hint="celkem"
          icon={<Sparkles className="h-3.5 w-3.5" />}
          accent="var(--warning)"
        />
      </div>

      {/* ── Návštěvnost ─────────────────────────────────────────── */}
      <Card>
        <CardHeader title="Návštěvnost" description="Návštěvníci po dnech" />
        <CardBody className="pt-2">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dny} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="provozBarva" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="den"
                  tickFormatter={(d: string) => formatDayShort(d)}
                  tick={{ fontSize: 11, fill: "var(--ink-subtle)" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--ink-subtle)" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={44}
                />
                <Tooltip
                  labelFormatter={(d) => formatDayShort(String(d))}
                  formatter={(v) => [formatNumber(Number(v ?? 0)), "návštěvníci"]}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="navstevnici"
                  stroke="var(--brand)"
                  strokeWidth={2}
                  fill="url(#provozBarva)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      {/* ── Trychtýř ────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Cesta zákazníka"
          description="Kolik lidí se dostane o krok dál. Procento je podíl na předchozím kroku."
        />
        <CardBody className="space-y-2 pt-3">
          {trychtyr.map((krok, i) => (
            <div key={krok.klic}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-ink">{krok.popisek}</span>
                <span className="tnum shrink-0 text-ink-muted">
                  {formatNumber(krok.pocet)}
                  {i > 0 ? (
                    <span className={krok.zPredchoziho < 10 ? "text-danger" : "text-ink-subtle"}>
                      {" "}
                      · {krok.zPredchoziho} %
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${Math.max(krok.zVrcholu, krok.pocet > 0 ? 1.5 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* ── Odkud a kam ─────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Zebricek nadpis="Odkud chodí" popis="Podle návštěvníků, ne kliknutí" radky={kanaly} />
        <Zebricek nadpis="Kam přistávají" popis="Nejnavštěvovanější stránky" radky={stranky} />
      </div>

      <Zebricek
        nadpis="Na čem to čtou"
        popis={null}
        radky={zarizeni.map((r) => ({ ...r, nazev: NAZEV_ZARIZENI[r.nazev] ?? r.nazev }))}
      />
    </div>
  );
}

function Zebricek({
  nadpis,
  popis,
  radky,
}: {
  nadpis: string;
  popis: string | null;
  radky: Radek[];
}) {
  return (
    <Card>
      <CardHeader title={nadpis} description={popis ?? undefined} />
      <CardBody className="space-y-1.5 pt-3">
        {radky.length === 0 ? (
          <p className="text-sm text-ink-subtle">Zatím nic. Data přibudou s návštěvami.</p>
        ) : (
          radky.map((r) => (
            <div key={r.nazev} className="relative overflow-hidden rounded-lg">
              <div
                className="absolute inset-y-0 left-0 bg-brand-soft"
                style={{ width: `${r.podil}%` }}
                aria-hidden
              />
              <div className="relative flex items-center justify-between gap-3 px-2.5 py-1.5 text-sm">
                <span className="truncate text-ink">{r.nazev}</span>
                <span className="tnum shrink-0 text-ink-muted">
                  {r.pocet} <span className="text-ink-subtle">· {r.podil} %</span>
                </span>
              </div>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}
