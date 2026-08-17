"use client";

import * as React from "react";
import { CalendarHeart, Car, MapPin, Plus, StickyNote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Segmented } from "@/components/ui/misc";
import { EventForm } from "./event-form";
import { EVENT_KINDS } from "@/lib/constants";
import { formatDay, formatTime, relativeDayLabel } from "@/lib/dates";
import { cn } from "@/lib/format";
import { memberName } from "@/lib/members";
import type { EventKind, FamilyEvent, SessionContext } from "@/lib/types";

export function EventsScreen({
  session,
  events,
  prefillDate,
}: {
  session: SessionContext;
  events: FamilyEvent[];
  prefillDate: string | null;
}) {
  const [tab, setTab] = React.useState<"budouci" | "minule">("budouci");
  const [kindFilter, setKindFilter] = React.useState<EventKind | "all">("all");
  const [formOpen, setFormOpen] = React.useState(Boolean(prefillDate));
  const [editing, setEditing] = React.useState<FamilyEvent | null>(null);

  const canEdit = session.myMembership.role !== "viewer";
  const now = Date.now();

  const upcoming = events.filter((e) => new Date(e.ends_at ?? e.starts_at).getTime() >= now);
  const past = events
    .filter((e) => new Date(e.ends_at ?? e.starts_at).getTime() < now)
    .reverse();

  const list = (tab === "budouci" ? upcoming : past).filter(
    (e) => kindFilter === "all" || e.kind === kindFilter,
  );

  const usedKinds = React.useMemo(() => {
    const set = new Set<EventKind>();
    for (const e of tab === "budouci" ? upcoming : past) set.add(e.kind);
    return [...set];
  }, [tab, upcoming, past]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Události</h1>
          <p className="text-sm text-ink-muted">
            Škola, lékař, výlety a schůzky — {upcoming.length} nadcházejících
          </p>
        </div>
        {canEdit ? (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Přidat
          </Button>
        ) : null}
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "budouci", label: `Nadcházející (${upcoming.length})` },
          { value: "minule", label: "Proběhlé" },
        ]}
      />

      {usedKinds.length > 1 ? (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setKindFilter("all")}
            className={cn(
              "shrink-0 rounded-pill border px-3 py-1.5 text-sm transition-colors",
              kindFilter === "all"
                ? "border-ink bg-ink text-canvas"
                : "border-line-strong text-ink-muted",
            )}
          >
            Vše
          </button>
          {usedKinds.map((k) => {
            const meta = EVENT_KINDS[k];
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKindFilter((prev) => (prev === k ? "all" : k))}
                className="flex shrink-0 items-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm transition-colors"
                style={
                  kindFilter === k
                    ? { backgroundColor: `${meta.color}22`, borderColor: meta.color, color: meta.color }
                    : { borderColor: "var(--line-strong)" }
                }
              >
                {meta.emoji} {meta.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarHeart className="h-6 w-6" />}
            title={tab === "budouci" ? "Nic naplánovaného" : "Žádná historie"}
            description={
              tab === "budouci"
                ? "Zapiš třídní schůzky, školu v přírodě nebo prohlídku u lékaře — a přijde ti připomínka."
                : "Tady se budou hromadit proběhlé události."
            }
            action={
              canEdit && tab === "budouci" ? (
                <Button
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" /> Přidat událost
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {list.map((e) => {
            const meta = EVENT_KINDS[e.kind];
            const child = session.children.find((c) => c.id === e.child_id);
            const start = new Date(e.starts_at);

            return (
              <li key={e.id}>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => {
                    setEditing(e);
                    setFormOpen(true);
                  }}
                  className="card flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-surface-2 disabled:cursor-default"
                  style={{ borderLeft: `3px solid ${meta.color}` }}
                >
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
                    style={{ backgroundColor: `${meta.color}1f` }}
                    aria-hidden
                  >
                    {meta.emoji}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-ink">{e.title}</span>
                      {child ? <Badge color={child.color}>{child.name}</Badge> : null}
                    </span>

                    <span className="mt-0.5 block text-sm text-ink-muted">
                      {formatDay(start)}
                      {!e.all_day ? ` · ${formatTime(start)}` : " · celý den"}
                      {e.ends_at && e.all_day ? ` – ${formatDay(new Date(e.ends_at))}` : ""}
                    </span>

                    <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-subtle">
                      {e.location ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {e.location}
                        </span>
                      ) : null}
                      {e.responsible ? (
                        <span className="flex items-center gap-1">
                          <Car className="h-3.5 w-3.5" />
                          {memberName(session.members, e.responsible)}
                        </span>
                      ) : null}
                      {e.notes ? (
                        <span className="flex items-center gap-1">
                          <StickyNote className="h-3.5 w-3.5" />
                          {e.notes}
                        </span>
                      ) : null}
                    </span>
                  </span>

                  {tab === "budouci" ? (
                    <Badge color={meta.color}>{relativeDayLabel(start)}</Badge>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <EventForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        session={session}
        event={editing}
        defaultDate={editing ? null : prefillDate}
      />
    </div>
  );
}
