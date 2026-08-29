"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { addDays, addMonths, isSameMonth, isToday, parseISO, startOfMonth } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Moon, Repeat } from "lucide-react";
import {
  DOW_SHORT,
  DOW_ORDER,
  formatDayShort,
  formatMonth,
  monthDays,
  monthGrid,
  toDateKey,
} from "@/lib/dates";
import { custodyStats, resolveCustody, type CustodyDay } from "@/lib/custody";
import { expandActivities } from "@/lib/activities";
import { holidayByDay, holidaysInRange, type Holiday } from "@/lib/holidays";
import { cn, days, nights, withAlpha } from "@/lib/format";
import { sideBg, sideColor, sideLabel } from "@/lib/members";
import { Card, CardBody } from "@/components/ui/card";
import { Segmented, SplitBar } from "@/components/ui/misc";
import { Dot } from "@/components/ui/badge";
import { DaySheet } from "./day-sheet";
import type {
  Activity,
  ActivityOccurrence,
  CustodyOverride,
  CustodyPattern,
  FamilyEvent,
  RozvrhHodina,
  RozvrhZmena,
  SessionContext,
} from "@/lib/types";

export function MonthView({
  session,
  monthKey,
  initialChildId,
  patterns,
  overrides,
  activities,
  occurrences,
  events,
  rozvrh,
  rozvrhZmeny,
}: {
  session: SessionContext;
  monthKey: string;
  initialChildId: string;
  patterns: CustodyPattern[];
  overrides: CustodyOverride[];
  activities: Activity[];
  occurrences: ActivityOccurrence[];
  events: FamilyEvent[];
  rozvrh: RozvrhHodina[];
  rozvrhZmeny: RozvrhZmena[];
}) {
  const router = useRouter();
  const [childId, setChildId] = React.useState(initialChildId);
  const [openDay, setOpenDay] = React.useState<string | null>(null);

  const anchor = parseISO(`${monthKey}-01T00:00:00`);
  const grid = React.useMemo(() => monthGrid(anchor), [monthKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const inMonth = React.useMemo(() => monthDays(anchor), [monthKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedChild =
    childId === "all" ? null : session.children.find((c) => c.id === childId) ?? null;

  /**
   * Péče se počítá pro každé dítě zvlášť — vzor může být pro každé jiný.
   * V pohledu „všechny děti“ se dny, kde se strany liší, označí jako smíšené.
   */
  const custodyByDay = React.useMemo(() => {
    const targets =
      selectedChild !== null
        ? [selectedChild.id]
        : session.children.length > 0
          ? session.children.map((c) => c.id)
          : [null];

    const perChild = targets.map((id) =>
      resolveCustody({ days: grid, patterns, overrides, childId: id }),
    );

    const map = new Map<string, { day: CustodyDay; mixed: boolean }>();
    grid.forEach((_, i) => {
      const dayVariants = perChild.map((arr) => arr[i]);
      const sides = new Set(dayVariants.map((d) => d.side));
      map.set(dayVariants[0].key, {
        day: dayVariants[0],
        mixed: sides.size > 1,
      });
    });
    return map;
  }, [grid, patterns, overrides, selectedChild, session.children]);

  const monthCustody = React.useMemo(
    () =>
      inMonth
        .map((d) => custodyByDay.get(toDateKey(d))?.day)
        .filter((d): d is CustodyDay => Boolean(d)),
    [inMonth, custodyByDay],
  );

  // Poslední noc v měsíci patří tomu, kdo má první den toho dalšího.
  // Mřížka kalendáře ho zná, protože dokresluje okolní týdny.
  const prvniDalsihoMesice = React.useMemo(() => {
    const posledni = inMonth[inMonth.length - 1];
    if (!posledni) return null;
    return custodyByDay.get(toDateKey(addDays(posledni, 1)))?.day ?? null;
  }, [inMonth, custodyByDay]);

  const stats = custodyStats(monthCustody, prvniDalsihoMesice);

  const visibleActivities = React.useMemo(
    () =>
      selectedChild ? activities.filter((a) => a.child_id === selectedChild.id) : activities,
    [activities, selectedChild],
  );

  const activityMap = React.useMemo(
    () => expandActivities(grid, visibleActivities, occurrences),
    [grid, visibleActivities, occurrences],
  );

  const eventMap = React.useMemo(() => {
    const map = new Map<string, FamilyEvent[]>();
    for (const e of events) {
      if (selectedChild && e.child_id && e.child_id !== selectedChild.id) continue;
      const key = e.starts_at.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [events, selectedChild]);

  const colorA = sideColor(session.members, "a");
  const colorB = sideColor(session.members, "b");
  // Velké plochy nesou tlumený odstín, plná barva zůstává tečkám a okrajům.
  const bgA = sideBg(session.members, "a");
  const bgB = sideBg(session.members, "b");

  /**
   * Prázdniny se počítají z okresu školy. Když mají sourozenci školy v různých
   * okresech, bereme okres vybraného dítěte — v pohledu na všechny děti okres
   * prvního, které ho má vyplněný.
   */
  const okres = React.useMemo(() => {
    if (selectedChild) return selectedChild.okres;
    return session.children.find((c) => c.okres)?.okres ?? null;
  }, [selectedChild, session.children]);

  const holidays = React.useMemo(() => {
    const first = toDateKey(grid[0]);
    const last = toDateKey(grid[grid.length - 1]);
    return holidaysInRange(first, last, okres);
  }, [grid, okres]);

  const holidayMap = React.useMemo(() => holidayByDay(holidays), [holidays]);

  /** Prázdniny, které zasahují do zobrazeného měsíce — pro popisek pod mřížkou. */
  const monthHolidays = React.useMemo(() => {
    const first = toDateKey(inMonth[0]);
    const last = toDateKey(inMonth[inMonth.length - 1]);
    return holidays.filter((h) => h.to >= first && h.from <= last);
  }, [holidays, inMonth]);

  function go(offset: number) {
    const target = toDateKey(startOfMonth(addMonths(anchor, offset))).slice(0, 7);
    router.push(`/kalendar?m=${target}&dite=${childId}`);
  }

  function selectChild(next: string) {
    setChildId(next);
    router.replace(`/kalendar?m=${monthKey}&dite=${next}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      {/* ── Hlavička s navigací měsíců ─────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold capitalize tracking-tight text-ink sm:text-2xl">
            {formatMonth(anchor)}
          </h1>
          <p className="text-sm text-ink-muted">
            {selectedChild ? selectedChild.name : "Všechny děti"}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Předchozí měsíc"
            className="rounded-xl border border-line-strong bg-surface p-2.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => router.push(`/kalendar?dite=${childId}`)}
            className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            Dnes
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Další měsíc"
            className="rounded-xl border border-line-strong bg-surface p-2.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {session.children.length > 1 ? (
        <Segmented
          value={childId}
          onChange={selectChild}
          options={[
            { value: "all", label: "Všechny" },
            ...session.children.map((c) => ({
              value: c.id,
              label: (
                <span className="flex items-center gap-1.5">
                  <Dot color={c.color} /> {c.name}
                </span>
              ),
            })),
          ]}
        />
      ) : null}

      {/* ── Mřížka měsíce ──────────────────────────────────────── */}
      <Card>
        <div className="grid grid-cols-7 border-b border-line bg-surface-2">
          {DOW_ORDER.map((d) => (
            <div
              key={d}
              className={cn(
                "py-2 text-center text-[11px] font-semibold uppercase tracking-wide",
                d === 0 || d === 6 ? "text-ink-subtle" : "text-ink-muted",
              )}
            >
              {DOW_SHORT[d]}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {grid.map((date) => {
            const key = toDateKey(date);
            const entry = custodyByDay.get(key);
            const side = entry?.day.side ?? null;
            const mixed = entry?.mixed ?? false;
            const outside = !isSameMonth(date, anchor);
            const today = isToday(date);
            const dayActivities = activityMap.get(key) ?? [];
            const dayEvents = eventMap.get(key) ?? [];
            const holiday = holidayMap.get(key);

            const tint = mixed ? undefined : side === "a" ? bgA : side === "b" ? bgB : undefined;

            /**
             * Den předání se kreslí diagonálně přepůlený: vlevo nahoře
             * ten, kdo má dítě přes den, vpravo dole ten, u koho tu noc
             * spí. Diagonála tak vždycky míří k přebírajícímu rodiči.
             *
             * Je to přesně to pravidlo, podle kterého se počítají noci —
             * jinak nejde poznat, proč jsou dva zaškrtnuté dny jedna noc.
             */
            const nocniStrana = custodyByDay.get(toDateKey(addDays(date, 1)))?.day.side ?? null;
            const predavka =
              !mixed && side !== null && nocniStrana !== null && nocniStrana !== side;
            const barvaDne = side === "a" ? bgA : bgB;
            const barvaNoci = nocniStrana === "a" ? bgA : bgB;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setOpenDay(key)}
                className={cn(
                  "relative flex min-h-[62px] flex-col items-center gap-1 border-b border-r border-line p-1 pt-1.5 transition-colors sm:min-h-[92px] sm:items-start sm:p-2",
                  outside && "opacity-45",
                  "hover:brightness-[0.97] active:brightness-95",
                )}
                title={holiday ? holiday.label : undefined}
                style={{
                  backgroundColor: predavka ? undefined : tint,
                  backgroundImage: mixed
                    ? `linear-gradient(135deg, ${bgA} 0 50%, ${bgB} 50% 100%)`
                    : predavka
                      ? `linear-gradient(135deg, ${barvaDne} 0 50%, ${barvaNoci} 50% 100%)`
                      : undefined,
                  // Prázdniny se kreslí šrafou přes barvu rodiče — obojí
                  // musí zůstat čitelné najednou, výplň by jedno přebila.
                  boxShadow: holiday ? "inset 0 0 0 2px var(--holiday)" : undefined,
                }}
              >
                {/* Prázdniny drží pruh u spodní hrany, ne celou dlaždici.
                    Přes celou plochu přebíjely barvu rodiče a po zavedení
                    diagonály předání by se s ní navíc tloukly. */}
                {holiday ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-[18%]"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(45deg, var(--holiday-stripe) 0 3px, transparent 3px 8px)",
                    }}
                  />
                ) : null}

                <span
                  className={cn(
                    "tnum relative flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-medium",
                    today ? "bg-ink text-canvas font-semibold" : "text-ink",
                  )}
                >
                  {date.getDate()}
                </span>

                {holiday ? (
                  <span className="relative hidden max-w-full truncate rounded-pill bg-holiday px-1.5 py-0.5 text-[10px] font-medium text-white sm:block">
                    {holiday.label}
                  </span>
                ) : null}

                {/* Značka ručně přepsaného dne */}
                {entry?.day.isOverride ? (
                  <Repeat className="absolute right-1 top-1.5 h-3 w-3 text-ink-subtle" />
                ) : null}

                <div className="relative flex w-full flex-wrap items-center justify-center gap-0.5 sm:justify-start">
                  {dayActivities.slice(0, 3).map((a) => (
                    <span
                      key={a.key}
                      title={`${a.activity.name} ${a.startsAt.slice(0, 5)}`}
                      className={cn("h-1.5 w-1.5 rounded-full", a.cancelled && "opacity-30")}
                      style={{ backgroundColor: a.activity.color }}
                    />
                  ))}
                  {dayEvents.slice(0, 2).map((e) => (
                    <span
                      key={e.id}
                      title={e.title}
                      className="h-1.5 w-1.5 rotate-45"
                      style={{ backgroundColor: "var(--warning)" }}
                    />
                  ))}
                </div>

                {/* Na desktopu ukážeme i názvy */}
                <div className="hidden w-full flex-col gap-0.5 sm:flex">
                  {dayActivities.slice(0, 2).map((a) => (
                    <span
                      key={a.key}
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-left text-[10px] font-medium leading-tight",
                        a.cancelled && "line-through opacity-50",
                      )}
                      style={{
                        backgroundColor: withAlpha(a.activity.color, 0.16),
                        color: a.activity.color,
                      }}
                    >
                      {a.startsAt.slice(0, 5)} {a.activity.name}
                    </span>
                  ))}
                  {dayEvents.slice(0, 1).map((e) => (
                    <span
                      key={e.id}
                      className="truncate rounded bg-warning-soft px-1 py-0.5 text-left text-[10px] font-medium leading-tight text-warning"
                    >
                      {e.title}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {monthHolidays.length > 0 ? (
        <Card>
          <CardBody className="space-y-2 py-3">
            {monthHolidays.map((h: Holiday) => (
              <div key={`${h.kind}-${h.from}`} className="flex items-center gap-2.5 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-ink-subtle" />
                <span className="font-medium text-ink">{h.label}</span>
                <span className="tnum ml-auto text-ink-muted">
                  {h.from === h.to
                    ? formatDayShort(h.from)
                    : `${formatDayShort(h.from)} – ${formatDayShort(h.to)}`}
                </span>
              </div>
            ))}
            {!okres ? (
              <p className="pt-1 text-xs text-ink-subtle">
                Jarní prázdniny se liší podle okresu školy — doplň ho u dítěte v sekci Děti
                a rodina.
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {/* ── Souhrn nocí ────────────────────────────────────────── */}
      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-ink">
            <Moon className="h-4 w-4 text-ink-subtle" />
            Noci v tomto měsíci
          </div>

          <p className="text-xs text-ink-subtle">
            Každý zaškrtnutý den se počítá jako jedna noc. Přepůlená dlaždice je den
            předání — vlevo nahoře ten, kdo má dítě přes den, vpravo dole ten, u koho
            spí.
          </p>

          <SplitBar a={stats.nightsA} b={stats.nightsB} colorA={colorA} colorB={colorB} />

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <Dot color={colorA} />
              <span className="text-ink-muted">{sideLabel(session.members, "a")}</span>
              <strong className="tnum text-ink">{nights(stats.nightsA)}</strong>
              <span className="text-ink-subtle">({stats.percentA} %)</span>
            </span>
            <span className="flex items-center gap-2">
              <Dot color={colorB} />
              <span className="text-ink-muted">{sideLabel(session.members, "b")}</span>
              <strong className="tnum text-ink">{nights(stats.nightsB)}</strong>
              <span className="text-ink-subtle">({stats.percentB} %)</span>
            </span>
          </div>

          {stats.unassigned > 0 ? (
            <p className="flex items-center gap-2 text-xs text-ink-subtle">
              <CalendarDays className="h-3.5 w-3.5" />
              {stats.unassigned} dní zatím nemá nastavené střídání — doplň vzor v{" "}
              <a href="/nastaveni/stridani" className="underline">
                nastavení
              </a>
              .
            </p>
          ) : null}
        </CardBody>
      </Card>

      {openDay ? (
        <DaySheet
          dayKey={openDay}
          onClose={() => setOpenDay(null)}
          session={session}
          custody={custodyByDay.get(openDay)?.day ?? null}
          mixed={custodyByDay.get(openDay)?.mixed ?? false}
          activities={activityMap.get(openDay) ?? []}
          events={eventMap.get(openDay) ?? []}
          rozvrh={rozvrh}
          zmeny={rozvrhZmeny}
          childId={childId === "all" ? null : childId}
        />
      ) : null}
    </div>
  );
}
