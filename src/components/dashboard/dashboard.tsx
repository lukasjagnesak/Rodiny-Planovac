"use client";

import * as React from "react";
import Link from "next/link";
import { addDays, endOfMonth, endOfYear, startOfMonth, startOfYear } from "date-fns";
import {
  ArrowRight,
  Car,
  GraduationCap,
  Home,
  MapPin,
  Moon,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Card, CardBody, CardHeader, StatTile } from "@/components/ui/card";
import { Zaciname, type Krok } from "@/components/dashboard/zaciname";
import { Avatar, Badge, Dot } from "@/components/ui/badge";
import { hodinyDneSeZmenami } from "@/lib/rozvrh";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, SplitBar } from "@/components/ui/misc";
import { custodyStatsForRange, resolveCustody } from "@/lib/custody";
import { expandActivities, kotvaTerminu } from "@/lib/activities";
import { EXPENSE_CATEGORIES, EVENT_KINDS } from "@/lib/constants";
import {
  DOW_LONG,
  formatDayShort,
  formatTime,
  relativeDayLabel,
  toDateKey,
} from "@/lib/dates";
import { cn, formatMoney, nights } from "@/lib/format";
import { memberName, sideBg, sideColor, sideLabel } from "@/lib/members";
import type {
  Activity,
  ActivityOccurrence,
  CustodyOverride,
  CustodyPattern,
  Expense,
  FamilyEvent,
  RozvrhHodina,
  RozvrhZmena,
  SessionContext,
} from "@/lib/types";

export function Dashboard({
  session,
  kroky,
  patterns,
  overrides,
  activities,
  occurrences,
  events,
  expenses,
  rozvrh,
  rozvrhZmeny,
}: {
  session: SessionContext;
  /** Rozjezdový checklist — zmizí sám, až bude hotovo. */
  kroky: Krok[];
  patterns: CustodyPattern[];
  overrides: CustodyOverride[];
  activities: Activity[];
  occurrences: ActivityOccurrence[];
  events: FamilyEvent[];
  expenses: Expense[];
  rozvrh: RozvrhHodina[];
  rozvrhZmeny: RozvrhZmena[];
}) {
  const today = new Date();
  const todayKey = toDateKey(today);
  const currency = session.family.currency;

  const colorA = sideColor(session.members, "a");
  const colorB = sideColor(session.members, "b");

  /** Kdy dnes které dítě končí ve škole — podle toho se plánuje odvoz. */
  const skolaDnes = React.useMemo(
    () =>
      session.children
        .filter((c) => !c.archived)
        .map((dite) => {
          // Odpadlá hodina posune konec vyučování — proto se počítá se změnami.
          const hodiny = hodinyDneSeZmenami(
            rozvrh.filter((h) => h.child_id === dite.id),
            rozvrhZmeny.filter((z) => z.child_id === dite.id),
            today,
          );
          return {
            dite,
            konec: hodiny.length > 0 ? hodiny[hodiny.length - 1].konec.slice(0, 5) : null,
          };
        })
        .filter((z): z is { dite: (typeof session.children)[number]; konec: string } =>
          z.konec !== null,
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rozvrh, rozvrhZmeny, todayKey, session.children],
  );

  /** Kdo má děti dnes (podle obecného vzoru rodiny). */
  const todayCustody = React.useMemo(
    () =>
      resolveCustody({
        days: [today, addDays(today, 1)],
        patterns,
        overrides,
        childId: null,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patterns, overrides, todayKey],
  );

  const monthStats = React.useMemo(
    () =>
      custodyStatsForRange({
        start: startOfMonth(today),
        end: endOfMonth(today),
        patterns,
        overrides,
        childId: null,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patterns, overrides, todayKey],
  );

  const yearStats = React.useMemo(
    () =>
      custodyStatsForRange({
        start: startOfYear(today),
        end: endOfYear(today),
        patterns,
        overrides,
        childId: null,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patterns, overrides, todayKey],
  );

  /** Nejbližší kroužky s dopravou — 7 dní dopředu. */
  const upcomingRides = React.useMemo(() => {
    const days = Array.from({ length: 8 }, (_, i) => addDays(today, i));
    const map = expandActivities(days, activities, occurrences);
    return days
      .flatMap((d) => map.get(toDateKey(d)) ?? [])
      .filter((a) => !a.cancelled)
      .slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, occurrences, todayKey]);

  const myRides = upcomingRides.filter(
    (a) => a.driverThere === session.userId || a.driverBack === session.userId,
  );

  const upcomingEvents = events
    .filter((e) => new Date(e.ends_at ?? e.starts_at) >= today)
    .slice(0, 5);

  const monthTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const perChild = session.children.map((c) => ({
    child: c,
    total: expenses
      .filter((e) => e.child_id === c.id)
      .reduce((sum, e) => sum + Number(e.amount), 0),
  }));

  const topCategory = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    return sorted[0] ?? null;
  }, [expenses]);

  const firstName = (session.profile.full_name || "").trim().split(" ")[0];

  return (
    <div className="space-y-4">
      {/* ── Pozdrav ────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-sm capitalize text-ink-muted">
          {DOW_LONG[today.getDay()]} {formatDayShort(today)}
        </p>
      </div>

      <Zaciname kroky={kroky} />

      {/* ── Kdo má dnes děti ───────────────────────────────────── */}
      <Card>
        <div
          className="flex items-center gap-3 p-4"
          style={{
            background: `linear-gradient(90deg, ${sideBg(session.members, todayCustody[0]?.side ?? null)}, transparent)`,
          }}
        >
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: sideBg(session.members, todayCustody[0]?.side ?? null),
              color: sideColor(session.members, todayCustody[0]?.side ?? null),
            }}
          >
            <Home className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
              Dnes u koho
            </p>
            <p className="truncate text-lg font-semibold text-ink">
              {sideLabel(session.members, todayCustody[0]?.side ?? null)}
            </p>
            {todayCustody[1] && todayCustody[1].side !== todayCustody[0]?.side ? (
              <p className="text-sm text-ink-muted">
                Zítra předání →{" "}
                <span className="font-medium">
                  {sideLabel(session.members, todayCustody[1].side)}
                </span>
              </p>
            ) : null}
          </div>

          <Link
            href="/kalendar"
            className="shrink-0 rounded-lg p-2 text-ink-subtle hover:bg-surface hover:text-ink"
            aria-label="Otevřít kalendář"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </Card>

      {/* ── Dnes ve škole ──────────────────────────────────────── */}
      {skolaDnes.length > 0 ? (
        <Card>
          <CardBody className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-subtle">
              <GraduationCap className="h-4 w-4" /> Dnes končí
            </span>
            {skolaDnes.map(({ dite, konec }) => (
              <span key={dite.id} className="flex items-center gap-1.5 text-sm">
                <Dot color={dite.color} />
                <span className="text-ink-muted">{dite.name}</span>
                <span className="tnum font-semibold text-ink">{konec}</span>
              </span>
            ))}
            <Link
              href="/rozvrh"
              className="ml-auto text-sm text-brand hover:underline"
            >
              Rozvrh
            </Link>
          </CardBody>
        </Card>
      ) : null}

      {/* ── Klíčová čísla ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Útrata / měsíc"
          value={<span className="tnum">{formatMoney(monthTotal, currency, true)}</span>}
          hint={
            topCategory
              ? `nejvíc: ${EXPENSE_CATEGORIES[topCategory[0] as keyof typeof EXPENSE_CATEGORIES].label}`
              : "zatím nic"
          }
          icon={<Wallet className="h-3.5 w-3.5" />}
          accent="var(--brand)"
        />
        <StatTile
          label="Noci / měsíc"
          value={
            <span className="tnum">
              {monthStats.nightsA} : {monthStats.nightsB}
            </span>
          }
          hint={`${sideLabel(session.members, "a")} : ${sideLabel(session.members, "b")}`}
          icon={<Moon className="h-3.5 w-3.5" />}
          accent={colorA}
        />
      </div>

      {/* ── Čas s dětmi ────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Čas s dětmi"
          description="Rozdělení nocí — tento měsíc a celý rok"
          action={
            <Link href="/kalendar" className="text-sm text-brand hover:underline">
              Kalendář
            </Link>
          }
        />
        <CardBody className="space-y-4 pt-3">
          {[
            { label: "Tento měsíc", stats: monthStats },
            { label: "Letos", stats: yearStats },
          ].map(({ label, stats }) => (
            <div key={label}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-ink-muted">{label}</span>
                <span className="tnum text-ink-subtle">
                  {stats.percentA} % / {stats.percentB} %
                </span>
              </div>
              <SplitBar a={stats.nightsA} b={stats.nightsB} colorA={colorA} colorB={colorB} />
              <div className="mt-1.5 flex justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <Dot color={colorA} />
                  <span className="text-ink-muted">{sideLabel(session.members, "a")}</span>
                  <span className="tnum font-medium text-ink">{nights(stats.nightsA)}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="tnum font-medium text-ink">{nights(stats.nightsB)}</span>
                  <span className="text-ink-muted">{sideLabel(session.members, "b")}</span>
                  <Dot color={colorB} />
                </span>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Doprava ──────────────────────────────────────────── */}
        <Card>
          <CardHeader
            title="Kdo veze"
            description={
              myRides.length > 0
                ? `${myRides.length}× vezeš ty`
                : "Nejbližší kroužky a doprava"
            }
            action={
              <Link href="/krouzky" className="text-sm text-brand hover:underline">
                Vše
              </Link>
            }
          />
          {upcomingRides.length === 0 ? (
            <EmptyState
              icon={<Car className="h-6 w-6" />}
              title="Žádné kroužky tento týden"
              description="Přidej kroužek a naplánuj, kdo veze."
            />
          ) : (
            <ul className="divide-y divide-line">
              {upcomingRides.map((ride) => {
                const child = session.children.find((c) => c.id === ride.activity.child_id);
                const mine =
                  ride.driverThere === session.userId || ride.driverBack === session.userId;
                return (
                  <li
                    key={ride.key}
                    className={cn("flex items-center gap-3 px-4 py-3", mine && "bg-brand-soft/40")}
                  >
                    <span
                      className="h-9 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: ride.activity.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate font-medium text-ink">
                          {ride.activity.name}
                        </span>
                        {child ? <Badge color={child.color}>{child.name}</Badge> : null}
                      </div>
                      <p className="tnum text-sm text-ink-muted">
                        {relativeDayLabel(ride.day)} · {formatTime(ride.startsAt)}
                        {ride.activity.location ? ` · ${ride.activity.location}` : ""}
                      </p>
                    </div>

                    {ride.driverThere ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Avatar
                          name={memberName(session.members, ride.driverThere)}
                          color={
                            session.members.find((m) => m.userId === ride.driverThere)?.color
                          }
                          size={28}
                        />
                      </div>
                    ) : (
                      <Badge
                        color="var(--warning)"
                        href={`/krouzky#${kotvaTerminu(ride.key)}`}
                        title="Doplnit, kdo veze"
                      >
                        bez řidiče
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* ── Nadcházející události ────────────────────────────── */}
        <Card>
          <CardHeader
            title="Co nás čeká"
            description="Škola, lékař a výlety"
            action={
              <Link href="/udalosti" className="text-sm text-brand hover:underline">
                Vše
              </Link>
            }
          />
          {upcomingEvents.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-6 w-6" />}
              title="Zatím nic naplánovaného"
              description="Zapiš třídní schůzky nebo prohlídku u lékaře."
              action={
                <ButtonLink href="/udalosti" variant="secondary" size="sm">
                  Přidat událost
                </ButtonLink>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {upcomingEvents.map((e) => {
                const meta = EVENT_KINDS[e.kind];
                const child = session.children.find((c) => c.id === e.child_id);
                return (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${meta.color}1f` }}
                      aria-hidden
                    >
                      {meta.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate font-medium text-ink">{e.title}</span>
                        {child ? <Badge color={child.color}>{child.name}</Badge> : null}
                      </div>
                      <p className="flex items-center gap-1.5 text-sm text-ink-muted">
                        {formatDayShort(e.starts_at)}
                        {!e.all_day ? ` · ${formatTime(e.starts_at)}` : ""}
                        {e.location ? (
                          <>
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{e.location}</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <Badge color={meta.color}>{relativeDayLabel(e.starts_at)}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* ── Útrata po dětech ───────────────────────────────────── */}
      {perChild.length > 0 ? (
        <Card>
          <CardHeader
            title="Útrata podle dětí"
            description="Tento měsíc"
            action={
              <Link href="/vydaje" className="text-sm text-brand hover:underline">
                Detail
              </Link>
            }
          />
          <CardBody className="grid gap-3 pt-3 sm:grid-cols-2 lg:grid-cols-3">
            {perChild.map(({ child, total }) => (
              <Link
                key={child.id}
                href="/vydaje"
                className="flex items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:bg-surface-2"
              >
                <Avatar name={child.name} color={child.color} src={child.avatar_url} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{child.name}</p>
                  <p className="tnum text-sm text-ink-muted">{formatMoney(total, currency)}</p>
                </div>
              </Link>
            ))}
          </CardBody>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={<Sparkles className="h-6 w-6" />}
            title="Přidej první dítě"
            description="Bez dětí toho plánovač moc neumí — začni v sekci Děti a rodina."
            action={<ButtonLink href="/deti">Přidat dítě</ButtonLink>}
          />
        </Card>
      )}
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Dobrou noc";
  if (h < 10) return "Dobré ráno";
  if (h < 18) return "Dobrý den";
  return "Dobrý večer";
}
