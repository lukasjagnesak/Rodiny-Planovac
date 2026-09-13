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
import { Eye, Users, Wallet, Sparkles, Radar } from "lucide-react";
import { Card, CardBody, CardHeader, StatTile } from "@/components/ui/card";
import { Segmented } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { formatDayShort } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import type { Den, Hodina, KrokTrychtyre, Radek } from "@/lib/provoz-souhrn";

/** V databázi jsou klíče bez diakritiky, na obrazovce patří česky. */
const NAZEV_ZARIZENI: Record<string, string> = {
  mobil: "Mobil",
  pocitac: "Počítač",
};

export function ProvozScreen({
  obdobi,
  dny,
  hodiny,
  trychtyr,
  kanaly,
  stranky,
  zarizeni,
  zaklad,
  kontakty,
}: {
  obdobi: number;
  dny: Den[];
  /** Posledních 24 hodin — nezávisle na zvoleném období. */
  hodiny: Hodina[];
  trychtyr: KrokTrychtyre[];
  kanaly: Radek[];
  stranky: Radek[];
  zarizeni: Radek[];
  zaklad: { rodin: number; platicich: number; vezkusebnim: number; leadu: number };
  /** Posledních pár kontaktů z webu — sem vede oznámení o novém. */
  kontakty: { email: string; magnet: string; kdo: string | null; kdy: string }[];
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
        <div className="flex flex-wrap items-center gap-2">
          {/* Konverze v Ads se lámou tiše, takže kontrola musí být na dosah. */}
          <ButtonLink href="/provoz/mereni" size="sm" variant="secondary">
            <Radar className="h-4 w-4" />
            Kontrola měření
          </ButtonLink>
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
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label={`Návštěvy / ${obdobi} dní`}
          value={<span className="tnum">{formatNumber(navstevnici)}</span>}
          hint={`${formatNumber(zobrazeni)} zobrazení · 1 člověk = 1 návštěva denně`}
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
        {/* Otisk návštěvníka se každý den mění, takže kdo přijde dvakrát
            v různé dny, je nahoře dvakrát. Konverze je tím spíš
            podhodnocená než nadsazená — a to je lepší směr. */}
        <p className="px-4 pt-3 text-xs text-ink-subtle sm:px-5">
          Vrchol jsou návštěvy, ne lidé: kdo přijde v pondělí a ve středu, počítá se dvakrát.
          Skutečná konverze je tedy o něco lepší než tahle čísla.
        </p>
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

      <PoslednichDvacetCtyri hodiny={hodiny} />

      <PosledniKontakty kontakty={kontakty} />
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


/**
 * Poslední kontakty z webu.
 *
 * Adresa je vidět schválně: u partnerských formulářů se odpovídá ručně
 * a stránka, na které je jen počet, znamená další hledání v databázi.
 * Je to interní přehled pro jednoho člověka, ne veřejný výpis.
 */
function PosledniKontakty({
  kontakty,
}: {
  kontakty: { email: string; magnet: string; kdo: string | null; kdy: string }[];
}) {
  if (kontakty.length === 0) return null;

  return (
    <Card>
      <CardHeader title="Poslední kontakty" description="Kdo nechal e-mail a za co" />
      <ul className="divide-y divide-line border-t border-line">
        {kontakty.map((k) => (
          <li key={`${k.email}-${k.kdy}`} className="flex items-start gap-3 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1">
              <a
                href={`mailto:${k.email}`}
                className="block truncate font-medium text-ink hover:text-brand"
              >
                {k.email}
              </a>
              <p className="mt-0.5 truncate text-sm text-ink-muted">
                {k.magnet}
                {k.kdo ? ` · ${k.kdo}` : ""}
              </p>
            </div>
            <span className="shrink-0 text-xs text-ink-subtle">
              {new Date(k.kdy).toLocaleDateString("cs-CZ")}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}


/**
 * Posledních 24 hodin po hodinách.
 *
 * Denní graf je na krátké okno slepý: kampaň spuštěná v poledne,
 * výpadek v noci i příspěvek, který se chytil, v něm vypadají stejně.
 * Tohle je jediné místo v přehledu, kde je vidět dnešek — a při zapnuté
 * reklamě je to ta informace, kvůli které se sem chodí.
 *
 * Zvolené období na tuhle kartu nemá vliv. Je to schválně: „posledních
 * 24 hodin" je otázka, na kterou se člověk ptá nezávisle na tom, jestli
 * si zrovna prohlíží týden nebo čtvrtletí.
 */
function PoslednichDvacetCtyri({ hodiny }: { hodiny: Hodina[] }) {
  const celkem = hodiny.reduce((s, h) => s + h.zobrazeni, 0);
  const nejvic = Math.max(1, ...hodiny.map((h) => h.zobrazeni));

  return (
    <Card>
      <CardHeader
        title="Posledních 24 hodin"
        description={
          celkem === 0
            ? "Za posledních 24 hodin nikdo nepřišel."
            : `${formatNumber(celkem)} zobrazení po hodinách`
        }
      />
      <CardBody className="pt-3">
        <div className="flex h-28 items-end gap-[3px]">
          {hodiny.map((h) => (
            <div
              key={h.zpet}
              className="group relative flex h-full flex-1 items-end"
              title={`${h.popisek} — ${h.zobrazeni} zobrazení, ${h.navstevnici} lidí`}
            >
              {/* Nulová hodina má nechat stopu, jinak z pauzy vznikne
                  mezera, která vypadá jako chybějící data. */}
              <div
                className="w-full rounded-t-[3px] bg-brand/80 transition-colors group-hover:bg-brand"
                style={{
                  height: h.zobrazeni === 0 ? "2px" : `${Math.max(6, (h.zobrazeni / nejvic) * 100)}%`,
                  opacity: h.zobrazeni === 0 ? 0.25 : 1,
                }}
              />
            </div>
          ))}
        </div>

        {/* Popisky jen po šesti hodinách — dvacet čtyři čísel vedle sebe
            se na mobilu slije v šedý pruh. */}
        <div className="mt-2 flex gap-[3px] text-[11px] text-ink-subtle">
          {hodiny.map((h) => (
            <span key={h.zpet} className="flex-1 text-center">
              {h.zpet % 6 === 0 ? h.popisek : "\u00a0"}
            </span>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
