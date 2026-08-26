"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Car, GraduationCap, MapPin, Plus, Undo2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/ui/sheet";
import { Badge, Dot } from "@/components/ui/badge";
import { Select } from "@/components/ui/field";
import { Alert, Spinner } from "@/components/ui/misc";
import { formatDayLong, formatTime, fromDateKey } from "@/lib/dates";
import { hodinyDne } from "@/lib/rozvrh";
import { sideColor, sideLabel } from "@/lib/members";
import { EVENT_KINDS } from "@/lib/constants";
import { cn } from "@/lib/format";
import type { CustodyDay } from "@/lib/custody";
import type { ActivityInstance } from "@/lib/activities";
import type {
  CustodySide,
  FamilyEvent,
  RozvrhHodina,
  SessionContext,
} from "@/lib/types";

export function DaySheet({
  dayKey,
  onClose,
  session,
  custody,
  mixed,
  activities,
  events,
  rozvrh,
  childId,
}: {
  dayKey: string;
  onClose: () => void;
  session: SessionContext;
  custody: CustodyDay | null;
  mixed: boolean;
  activities: ActivityInstance[];
  events: FamilyEvent[];
  rozvrh: RozvrhHodina[];
  childId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const canEdit = session.myMembership.role !== "viewer";

  async function setOverride(side: CustodySide | null) {
    setBusy(true);
    setError(null);
    const supabase = createClient();

    try {
      if (side === null) {
        const query = supabase
          .from("custody_overrides")
          .delete()
          .eq("family_id", session.family.id)
          .eq("day", dayKey);
        const { error } = childId
          ? await query.eq("child_id", childId)
          : await query.is("child_id", null);
        if (error) throw error;
      } else {
        // Ruční ekvivalent UPSERT — unikátní index počítá s NULL child_id.
        const del = supabase
          .from("custody_overrides")
          .delete()
          .eq("family_id", session.family.id)
          .eq("day", dayKey);
        if (childId) await del.eq("child_id", childId);
        else await del.is("child_id", null);

        const { error } = await supabase.from("custody_overrides").insert({
          family_id: session.family.id,
          child_id: childId,
          day: dayKey,
          side,
          created_by: session.userId,
        });
        if (error) throw error;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Uložení se nepovedlo.");
    } finally {
      setBusy(false);
    }
  }

  async function setDriver(
    instance: ActivityInstance,
    field: "driver_there" | "driver_back",
    userId: string | null,
  ) {
    setBusy(true);
    setError(null);
    const supabase = createClient();

    try {
      const { error } = await supabase.from("activity_occurrences").upsert(
        {
          family_id: session.family.id,
          activity_id: instance.activity.id,
          day: instance.day,
          cancelled: instance.cancelled,
          driver_there:
            field === "driver_there" ? userId : instance.driverThere,
          driver_back: field === "driver_back" ? userId : instance.driverBack,
        },
        { onConflict: "activity_id,day" },
      );
      if (error) throw error;
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Uložení se nepovedlo.");
    } finally {
      setBusy(false);
    }
  }

  const side = custody?.side ?? null;

  /**
   * Kdy má které dítě ten den školu. Kvůli tomuhle rozvrh v aplikaci je —
   * kdo veze a kdo přebírá, se plánuje podle konce vyučování.
   */
  const skola = React.useMemo(() => {
    const den = fromDateKey(dayKey);
    const deti = childId
      ? session.children.filter((c) => c.id === childId)
      : session.children;

    return deti
      .map((dite) => {
        const hodiny = hodinyDne(
          rozvrh.filter((h) => h.child_id === dite.id),
          den,
        );
        return { dite, hodiny };
      })
      .filter((z) => z.hodiny.length > 0);
  }, [rozvrh, dayKey, childId, session.children]);

  return (
    <Sheet open onClose={onClose} title={formatDayLong(dayKey)} size="lg">
      <div className="space-y-5">
        {error ? <Alert tone="danger">{error}</Alert> : null}

        {/* ── U koho děti jsou ─────────────────────────────────── */}
        <section className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            Kdo má děti
          </h3>

          {mixed ? (
            <Alert tone="warning">
              Děti jsou tento den u různých rodičů. Vyber konkrétní dítě nahoře v kalendáři a den
              uprav zvlášť.
            </Alert>
          ) : (
            <div
              className="flex items-center gap-3 rounded-xl p-3"
              style={{ backgroundColor: `${sideColor(session.members, side)}22` }}
            >
              <Dot color={sideColor(session.members, side)} className="h-3 w-3" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">
                  {sideLabel(session.members, side)}
                </p>
                {custody?.isOverride ? (
                  <p className="text-xs text-ink-muted">
                    Ručně upraveno{custody.overrideReason ? ` — ${custody.overrideReason}` : ""}
                  </p>
                ) : (
                  <p className="text-xs text-ink-muted">Podle nastaveného střídání</p>
                )}
              </div>
            </div>
          )}

          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              {(["a", "b"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy}
                  onClick={() => setOverride(s)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50",
                    side === s
                      ? "border-transparent"
                      : "border-line-strong hover:bg-surface-2",
                  )}
                  style={
                    side === s
                      ? { backgroundColor: `${sideColor(session.members, s)}22` }
                      : undefined
                  }
                >
                  <Dot color={sideColor(session.members, s)} />
                  {sideLabel(session.members, s)}
                </button>
              ))}

              {custody?.isOverride ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setOverride(null)}
                  className="flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-sm text-ink-muted hover:bg-surface-2 disabled:opacity-50"
                >
                  <Undo2 className="h-3.5 w-3.5" /> Zpět na vzor
                </button>
              ) : null}

              {busy ? <Spinner className="self-center text-ink-subtle" /> : null}
            </div>
          ) : null}

          {childId ? (
            <p className="text-xs text-ink-subtle">
              Úprava se uloží jen pro vybrané dítě.
            </p>
          ) : (
            <p className="text-xs text-ink-subtle">Úprava se uloží pro všechny děti.</p>
          )}
        </section>

        {/* ── Škola ─────────────────────────────────────────────── */}
        {skola.length > 0 ? (
          <section className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
              Škola
            </h3>
            <ul className="space-y-2">
              {skola.map(({ dite, hodiny }) => (
                <li
                  key={dite.id}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3"
                  style={{ borderLeft: `3px solid ${dite.color}` }}
                >
                  <GraduationCap className="h-4 w-4 shrink-0 text-ink-subtle" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{dite.name}</p>
                    <p className="tnum text-xs text-ink-muted">
                      {hodiny[0].zacatek.slice(0, 5)}–
                      {hodiny[hodiny.length - 1].konec.slice(0, 5)} · {hodiny.length}{" "}
                      {hodiny.length === 1 ? "hodina" : hodiny.length < 5 ? "hodiny" : "hodin"}
                    </p>
                  </div>
                  <Link
                    href="/rozvrh"
                    className="shrink-0 text-xs font-medium text-brand hover:underline"
                  >
                    Rozvrh
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ── Kroužky ───────────────────────────────────────────── */}
        {activities.length > 0 ? (
          <section className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
              Kroužky
            </h3>
            <ul className="space-y-2">
              {activities.map((a) => {
                const child = session.children.find((c) => c.id === a.activity.child_id);
                return (
                  <li
                    key={a.key}
                    className="rounded-xl border border-line bg-surface-2 p-3"
                    style={{ borderLeft: `3px solid ${a.activity.color}` }}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span
                        className={cn(
                          "font-medium text-ink",
                          a.cancelled && "line-through opacity-60",
                        )}
                      >
                        {a.activity.name}
                      </span>
                      <span className="tnum text-sm text-ink-muted">
                        {formatTime(a.startsAt)}–{formatTime(a.endsAt)}
                      </span>
                      {child ? <Badge color={child.color}>{child.name}</Badge> : null}
                      {a.cancelled ? <Badge>zrušeno</Badge> : null}
                    </div>

                    {a.activity.location ? (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {a.activity.location}
                      </p>
                    ) : null}

                    {canEdit ? (
                      <div className="mt-2.5 grid grid-cols-2 gap-2">
                        <DriverSelect
                          label="Tam"
                          session={session}
                          value={a.driverThere}
                          disabled={busy}
                          onChange={(v) => setDriver(a, "driver_there", v)}
                        />
                        <DriverSelect
                          label="Zpět"
                          session={session}
                          value={a.driverBack}
                          disabled={busy}
                          onChange={(v) => setDriver(a, "driver_back", v)}
                        />
                      </div>
                    ) : (
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted">
                        <Car className="h-3.5 w-3.5" />
                        {session.members.find((m) => m.userId === a.driverThere)?.name ??
                          "Řidič nepřiřazen"}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* ── Události ──────────────────────────────────────────── */}
        {events.length > 0 ? (
          <section className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
              Události
            </h3>
            <ul className="space-y-2">
              {events.map((e) => {
                const meta = EVENT_KINDS[e.kind];
                const child = session.children.find((c) => c.id === e.child_id);
                return (
                  <li key={e.id} className="rounded-xl border border-line bg-surface-2 p-3">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span aria-hidden>{meta.emoji}</span>
                      <span className="font-medium text-ink">{e.title}</span>
                      {!e.all_day ? (
                        <span className="tnum text-sm text-ink-muted">
                          {formatTime(e.starts_at)}
                        </span>
                      ) : (
                        <Badge>celý den</Badge>
                      )}
                      {child ? <Badge color={child.color}>{child.name}</Badge> : null}
                    </div>
                    {e.location ? (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {e.location}
                      </p>
                    ) : null}
                    {e.responsible ? (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
                        <Car className="h-3.5 w-3.5 shrink-0" />
                        {session.members.find((m) => m.userId === e.responsible)?.name}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* ── Rychlé akce ──────────────────────────────────────── */}
        {canEdit ? (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link
              href={`/udalosti?nova=${dayKey}`}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm font-medium hover:bg-surface-2"
            >
              <Plus className="h-4 w-4" /> Událost
            </Link>
            <Link
              href={`/vydaje?novy=${dayKey}`}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm font-medium hover:bg-surface-2"
            >
              <Plus className="h-4 w-4" /> Výdaj
            </Link>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}

function DriverSelect({
  label,
  session,
  value,
  onChange,
  disabled,
}: {
  label: string;
  session: SessionContext;
  value: string | null;
  onChange: (userId: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-xs font-medium text-ink-muted">
        <Car className="h-3 w-3" /> {label}
      </span>
      <Select
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
        className="py-2 text-sm"
      >
        <option value="">Nepřiřazeno</option>
        {session.members.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.name}
          </option>
        ))}
      </Select>
    </label>
  );
}
