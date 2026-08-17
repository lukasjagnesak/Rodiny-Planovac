"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { addMonths, isSameMonth, isToday, parseISO, startOfMonth } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Moon, Repeat } from "lucide-react";
import {
  DOW_SHORT,
  DOW_ORDER,
  formatMonth,
  monthDays,
  monthGrid,
  toDateKey,
} from "@/lib/dates";
import { custodyStats, resolveCustody, type CustodyDay } from "@/lib/custody";
import { expandActivities } from "@/lib/activities";
import { cn, nights, withAlpha } from "@/lib/format";
import { sideColor, sideLabel } from "@/lib/members";
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
}: {
  session: SessionContext;
  monthKey: string;
  initialChildId: string;
  patterns: CustodyPattern[];
  overrides: CustodyOverride[];
  activities: Activity[];
  occurrences: ActivityOccurrence[];
  events: FamilyEvent[];
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

  const stats = custodyStats(monthCustody);

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

            const tint = mixed
              ? undefined
              : side === "a"
                ? withAlpha(colorA, outside ? 0.07 : 0.16)
                : side === "b"
                  ? withAlpha(colorB, outside ? 0.07 : 0.16)
                  : undefined;

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
                style={{
                  backgroundColor: tint,
                  backgroundImage: mixed
                    ? `linear-gradient(135deg, ${withAlpha(colorA, 0.16)} 0 50%, ${withAlpha(colorB, 0.16)} 50% 100%)`
                    : undefined,
                }}
              >
                <span
                  className={cn(
                    "tnum flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-medium",
                    today ? "bg-ink text-canvas font-semibold" : "text-ink",
                  )}
                >
                  {date.getDate()}
                </span>

                {/* Značka ručně přepsaného dne */}
                {entry?.day.isOverride ? (
                  <Repeat className="absolute right-1 top-1.5 h-3 w-3 text-ink-subtle" />
                ) : null}

                <div className="flex w-full flex-wrap items-center justify-center gap-0.5 sm:justify-start">
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

      {/* ── Souhrn nocí ────────────────────────────────────────── */}
      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-ink">
            <Moon className="h-4 w-4 text-ink-subtle" />
            Noci v tomto měsíci
          </div>

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
          childId={childId === "all" ? null : childId}
        />
      ) : null}
    </div>
  );
}
