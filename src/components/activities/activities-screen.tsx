"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { addDays, parseISO } from "date-fns";
import { Bike, Car, Clock, MapPin, Pencil, Plus, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Alert, EmptyState, Segmented } from "@/components/ui/misc";
import { ActivityForm } from "./activity-form";
import {
  expandActivities,
  kotvaTerminu,
  monthlyCost,
  type ActivityInstance,
} from "@/lib/activities";
import { DOW_LONG, DOW_ORDER, formatDayShort, formatTime, toDateKey } from "@/lib/dates";
import { cn, formatMoney, withAlpha, hlaskaChyby } from "@/lib/format";
import { PRICE_PERIODS } from "@/lib/constants";
import type { Activity, ActivityOccurrence, SessionContext } from "@/lib/types";

export function ActivitiesScreen({
  session,
  activities,
  occurrences,
  weekStartKey,
}: {
  session: SessionContext;
  activities: Activity[];
  occurrences: ActivityOccurrence[];
  weekStartKey: string;
}) {
  const [tab, setTab] = React.useState<"tyden" | "seznam">("tyden");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Activity | null>(null);

  const canEdit = session.myMembership.role !== "viewer";

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (activity: Activity) => {
    setEditing(activity);
    setFormOpen(true);
  };

  const totalMonthly = activities
    .filter((a) => a.active)
    .reduce((sum, a) => sum + monthlyCost(a), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Kroužky</h1>
          <p className="text-sm text-ink-muted">
            {activities.filter((a) => a.active).length} aktivních ·{" "}
            <span className="tnum">{formatMoney(totalMonthly, session.family.currency)}</span> /
            měsíc
          </p>
        </div>
        {canEdit ? (
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Přidat
          </Button>
        ) : null}
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "tyden", label: "Doprava na 2 týdny" },
          { value: "seznam", label: "Všechny kroužky" },
        ]}
      />

      {activities.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bike className="h-6 w-6" />}
            title="Zatím žádné kroužky"
            description="Přidej první kroužek — objeví se v kalendáři a můžeš k němu plánovat, kdo veze."
            action={
              canEdit ? (
                <Button onClick={openNew}>
                  <Plus className="h-4 w-4" /> Přidat kroužek
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : tab === "tyden" ? (
        <TransportPlanner
          session={session}
          activities={activities}
          occurrences={occurrences}
          weekStartKey={weekStartKey}
        />
      ) : (
        <ActivityList session={session} activities={activities} onEdit={openEdit} />
      )}

      <ActivityForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        session={session}
        activity={editing}
      />
    </div>
  );
}

/** Rozpis nejbližších dvou týdnů s možností přiřadit řidiče. */
function TransportPlanner({
  session,
  activities,
  occurrences,
  weekStartKey,
}: {
  session: SessionContext;
  activities: Activity[];
  occurrences: ActivityOccurrence[];
  weekStartKey: string;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<string | null>(null);

  const canEdit = session.myMembership.role !== "viewer";
  const start = parseISO(`${weekStartKey}T00:00:00`);
  const days = React.useMemo(
    () => Array.from({ length: 14 }, (_, i) => addDays(start, i)),
    [weekStartKey], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const byDay = React.useMemo(
    () => expandActivities(days, activities, occurrences),
    [days, activities, occurrences],
  );

  const daysWithSomething = days.filter((d) => (byDay.get(toDateKey(d)) ?? []).length > 0);

  async function assign(
    instance: ActivityInstance,
    field: "driver_there" | "driver_back",
    userId: string | null,
  ) {
    setPending(`${instance.key}:${field}`);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase.from("activity_occurrences").upsert(
      {
        family_id: session.family.id,
        activity_id: instance.activity.id,
        day: instance.day,
        cancelled: instance.cancelled,
        driver_there: field === "driver_there" ? userId : instance.driverThere,
        driver_back: field === "driver_back" ? userId : instance.driverBack,
      },
      { onConflict: "activity_id,day" },
    );

    setPending(null);
    if (error) setError(hlaskaChyby(error));
    else router.refresh();
  }

  async function toggleCancelled(instance: ActivityInstance) {
    setPending(`${instance.key}:cancel`);
    const supabase = createClient();
    const { error } = await supabase.from("activity_occurrences").upsert(
      {
        family_id: session.family.id,
        activity_id: instance.activity.id,
        day: instance.day,
        cancelled: !instance.cancelled,
        driver_there: instance.driverThere,
        driver_back: instance.driverBack,
      },
      { onConflict: "activity_id,day" },
    );
    setPending(null);
    if (error) setError(hlaskaChyby(error));
    else router.refresh();
  }

  if (daysWithSomething.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Car className="h-6 w-6" />}
          title="V nejbližších dvou týdnech žádný kroužek není"
          description="Zkontroluj, jestli kroužky mají správně nastavené období."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {daysWithSomething.map((date) => {
        const key = toDateKey(date);
        const list = byDay.get(key) ?? [];
        const isToday = key === toDateKey(new Date());

        return (
          <Card key={key}>
            <div
              className={cn(
                "flex items-center gap-2 border-b border-line px-4 py-2.5",
                isToday ? "bg-brand-soft" : "bg-surface-2",
              )}
            >
              <span
                className={cn(
                  "text-sm font-semibold capitalize",
                  isToday ? "text-brand" : "text-ink",
                )}
              >
                {DOW_LONG[date.getDay()]}
              </span>
              <span className="text-sm text-ink-muted">{formatDayShort(date)}</span>
              {isToday ? <Badge color="var(--brand)">dnes</Badge> : null}
            </div>

            <ul className="divide-y divide-line">
              {list.map((instance) => {
                const child = session.children.find((c) => c.id === instance.activity.child_id);
                return (
                  // `scroll-mt` kvůli lepící hlavičce — bez něj by termín,
                  // na který se přišlo z přehledu, skončil schovaný pod ní.
                  <li
                    key={instance.key}
                    id={kotvaTerminu(instance.key)}
                    className="scroll-mt-24 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Dot color={instance.activity.color} />
                      <span
                        className={cn(
                          "font-medium text-ink",
                          instance.cancelled && "line-through opacity-60",
                        )}
                      >
                        {instance.activity.name}
                      </span>
                      {child ? <Badge color={child.color}>{child.name}</Badge> : null}
                      <span className="tnum ml-auto text-sm text-ink-muted">
                        {formatTime(instance.startsAt)}–{formatTime(instance.endsAt)}
                      </span>
                    </div>

                    {instance.activity.location ? (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {instance.activity.location}
                      </p>
                    ) : null}

                    {canEdit ? (
                      <>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {(["driver_there", "driver_back"] as const).map((field) => (
                            <label key={field} className="block">
                              <span className="mb-1 flex items-center gap-1 text-xs font-medium text-ink-muted">
                                <Car className="h-3 w-3" />
                                {field === "driver_there" ? "Veze tam" : "Veze zpět"}
                              </span>
                              <Select
                                className="py-2 text-sm"
                                disabled={
                                  instance.cancelled || pending === `${instance.key}:${field}`
                                }
                                value={
                                  (field === "driver_there"
                                    ? instance.driverThere
                                    : instance.driverBack) ?? ""
                                }
                                onChange={(e) => assign(instance, field, e.target.value || null)}
                              >
                                <option value="">Nepřiřazeno</option>
                                {session.members.map((m) => (
                                  <option key={m.userId} value={m.userId}>
                                    {m.name}
                                  </option>
                                ))}
                              </Select>
                            </label>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleCancelled(instance)}
                          disabled={pending === `${instance.key}:cancel`}
                          className="mt-2 text-xs text-ink-subtle underline-offset-4 hover:text-ink hover:underline disabled:opacity-50"
                        >
                          {instance.cancelled ? "Zrušení zrušit" : "Tento termín odpadá"}
                        </button>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-ink-muted">
                        Veze:{" "}
                        {session.members.find((m) => m.userId === instance.driverThere)?.name ??
                          "nepřiřazeno"}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

/** Přehled všech kroužků seskupených podle dne v týdnu. */
function ActivityList({
  session,
  activities,
  onEdit,
}: {
  session: SessionContext;
  activities: Activity[];
  onEdit: (a: Activity) => void;
}) {
  const canEdit = session.myMembership.role !== "viewer";

  return (
    <div className="space-y-3">
      {DOW_ORDER.map((dow) => {
        const list = activities.filter((a) => a.day_of_week === dow);
        if (list.length === 0) return null;

        return (
          <Card key={dow}>
            <CardHeader title={<span className="capitalize">{DOW_LONG[dow]}</span>} />
            <CardBody className="pt-3">
              <ul className="space-y-2">
                {list.map((a) => {
                  const child = session.children.find((c) => c.id === a.child_id);
                  return (
                    <li
                      key={a.id}
                      className="flex items-start gap-3 rounded-xl p-3"
                      style={{ backgroundColor: withAlpha(a.color, 0.08) }}
                    >
                      <span
                        className="mt-1 h-8 w-1 shrink-0 rounded-full"
                        style={{ backgroundColor: a.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn("font-medium text-ink", !a.active && "opacity-50")}
                          >
                            {a.name}
                          </span>
                          {child ? <Badge color={child.color}>{child.name}</Badge> : null}
                          {!a.active ? <Badge>neaktivní</Badge> : null}
                        </div>

                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-muted">
                          <span className="tnum flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(a.starts_at)}–{formatTime(a.ends_at)}
                          </span>
                          {a.location ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {a.location}
                            </span>
                          ) : null}
                          {a.price ? (
                            <span className="tnum flex items-center gap-1">
                              <Wallet className="h-3.5 w-3.5" />
                              {formatMoney(Number(a.price), session.family.currency)}{" "}
                              {PRICE_PERIODS[a.price_period ?? "season"]}
                            </span>
                          ) : null}
                        </div>

                        {a.notes ? (
                          <p className="mt-1 text-sm text-ink-subtle">{a.notes}</p>
                        ) : null}
                      </div>

                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => onEdit(a)}
                          aria-label={`Upravit ${a.name}`}
                          className="shrink-0 rounded-lg p-2 text-ink-subtle hover:bg-surface hover:text-ink"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
