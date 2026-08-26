"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { startOfWeek } from "date-fns";
import { CalendarRange, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Sheet, ConfirmSheet } from "@/components/ui/sheet";
import { Alert, EmptyState, Spinner } from "@/components/ui/misc";
import { WeeklyMapEditor } from "@/app/vitejte/wizard";
import {
  PATTERN_HINTS,
  PATTERN_LABELS,
  currentWeekInfo,
  findDoubleWeeks,
} from "@/lib/custody";
import { WEEK_OPTS, formatDay, toDateKey } from "@/lib/dates";
import { sideColor, sideLabel } from "@/lib/members";
import type {
  CustodyOverride,
  CustodyPattern,
  CustodySide,
  PatternKind,
  SessionContext,
} from "@/lib/types";

export function CustodySettings({
  session,
  patterns,
  overrides,
}: {
  session: SessionContext;
  patterns: CustodyPattern[];
  overrides: CustodyOverride[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CustodyPattern | null>(null);
  const [busyOverride, setBusyOverride] = React.useState<string | null>(null);

  const canEdit = session.myMembership.role !== "viewer";

  async function deleteOverride(id: string) {
    setBusyOverride(id);
    const supabase = createClient();
    await supabase.from("custody_overrides").delete().eq("id", id);
    setBusyOverride(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Střídání péče
        </h1>
        <p className="text-sm text-ink-muted">
          Vzor určuje, u koho děti jsou. Novější vzor přebíjí ten starší, výjimky přebíjí vše.
        </p>
      </div>

      {/* ── Legenda stran ──────────────────────────────────────── */}
      <Card>
        <CardBody className="flex flex-wrap gap-4">
          {(["a", "b"] as const).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <Dot color={sideColor(session.members, s)} className="h-3 w-3" />
              <div>
                <p className="text-sm font-medium text-ink">Strana {s.toUpperCase()}</p>
                <p className="text-xs text-ink-muted">{sideLabel(session.members, s)}</p>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      {patterns.some((p) => p.kind === "iso_week_parity") ? <DoubleWeekWarning /> : null}

      {/* ── Vzory ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Vzory střídání"
          description={`${patterns.length} nastavených`}
          action={
            canEdit ? (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Přidat
              </Button>
            ) : null
          }
        />

        {patterns.length === 0 ? (
          <EmptyState
            icon={<Repeat className="h-6 w-6" />}
            title="Žádný vzor"
            description="Bez vzoru zůstane kalendář prázdný. Přidej alespoň jeden."
          />
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {patterns.map((p) => {
              const child = session.children.find((c) => c.id === p.child_id);
              return (
                <li key={p.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                  <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Repeat className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-ink">{PATTERN_LABELS[p.kind]}</span>
                      {child ? (
                        <Badge color={child.color}>jen {child.name}</Badge>
                      ) : (
                        <Badge>všechny děti</Badge>
                      )}
                    </div>

                    <p className="mt-0.5 text-sm text-ink-muted">
                      Platí od {formatDay(p.starts_on)}
                      {p.ends_on ? ` do ${formatDay(p.ends_on)}` : ""}
                    </p>

                    {p.kind === "custom_weekly" && p.weekly_map ? (
                      <p className="mt-1 flex gap-1 text-xs">
                        {p.weekly_map.split("").map((c, i) => (
                          <span
                            key={i}
                            className="flex h-5 w-6 items-center justify-center rounded text-white"
                            style={{
                              backgroundColor: sideColor(session.members, c as CustodySide),
                            }}
                          >
                            {["Po", "Út", "St", "Čt", "Pá", "So", "Ne"][i]}
                          </span>
                        ))}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-ink-subtle">
                        {p.kind === "fixed_parent"
                          ? `Trvale u: ${sideLabel(session.members, p.fixed_side ?? p.anchor_side)}`
                          : p.kind === "iso_week_parity"
                            ? `Sudý týden: ${sideLabel(session.members, p.anchor_side)} · lichý: ${sideLabel(
                                session.members,
                                p.anchor_side === "a" ? "b" : "a",
                              )}`
                            : `První cyklus od ${formatDay(p.anchor_date)}: ${sideLabel(session.members, p.anchor_side)}`}
                      </p>
                    )}
                  </div>

                  {canEdit ? (
                    <button
                      type="button"
                      aria-label="Upravit vzor"
                      onClick={() => {
                        setEditing(p);
                        setFormOpen(true);
                      }}
                      className="shrink-0 rounded-lg p-2 text-ink-subtle hover:bg-surface-2 hover:text-ink"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* ── Výjimky ────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Nadcházející výjimky"
          description="Dny, které jste ručně přehodili — nastavíš je klikem na den v kalendáři"
        />

        {overrides.length === 0 ? (
          <EmptyState
            icon={<CalendarRange className="h-6 w-6" />}
            title="Žádné výjimky"
            description="Vše jede podle vzoru."
          />
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {overrides.map((o) => {
              const child = session.children.find((c) => c.id === o.child_id);
              return (
                <li key={o.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <Dot color={sideColor(session.members, o.side)} className="h-3 w-3" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{formatDay(o.day)}</p>
                    <p className="truncate text-sm text-ink-muted">
                      {sideLabel(session.members, o.side)}
                      {child ? ` · jen ${child.name}` : ""}
                      {o.reason ? ` · ${o.reason}` : ""}
                    </p>
                  </div>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => deleteOverride(o.id)}
                      disabled={busyOverride === o.id}
                      aria-label="Zrušit výjimku"
                      className="shrink-0 rounded-lg p-2 text-ink-subtle hover:bg-surface-2 hover:text-danger disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <PatternForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        session={session}
        pattern={editing}
      />
    </div>
  );
}

function PatternForm({
  open,
  onClose,
  session,
  pattern,
}: {
  open: boolean;
  onClose: () => void;
  session: SessionContext;
  pattern: CustodyPattern | null;
}) {
  const router = useRouter();
  const [form, setForm] = React.useState(empty());
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setForm(
      pattern
        ? {
            kind: pattern.kind,
            child_id: pattern.child_id ?? "",
            starts_on: pattern.starts_on,
            ends_on: pattern.ends_on ?? "",
            anchor_date: pattern.anchor_date,
            anchor_side: pattern.anchor_side,
            weekly_map: pattern.weekly_map ?? "aabbaab",
            fixed_side: pattern.fixed_side ?? "a",
            note: pattern.note ?? "",
          }
        : empty(),
    );
    setError(null);
  }, [open, pattern]);

  function set<K extends keyof ReturnType<typeof empty>>(
    key: K,
    value: ReturnType<typeof empty>[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    const supabase = createClient();

    const payload = {
      family_id: session.family.id,
      child_id: form.child_id || null,
      kind: form.kind,
      starts_on: form.starts_on,
      ends_on: form.ends_on || null,
      anchor_date: form.anchor_date || form.starts_on,
      anchor_side: form.anchor_side,
      weekly_map: form.kind === "custom_weekly" ? form.weekly_map : null,
      fixed_side: form.kind === "fixed_parent" ? form.fixed_side : null,
      note: form.note.trim() || null,
    };

    const { error } = pattern
      ? await supabase.from("custody_patterns").update(payload).eq("id", pattern.id)
      : await supabase.from("custody_patterns").insert(payload);

    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onClose();
    router.refresh();
  }

  async function remove() {
    if (!pattern) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("custody_patterns").delete().eq("id", pattern.id);
    setBusy(false);
    if (error) {
      setError(error.message);
      setConfirmDelete(false);
      return;
    }
    setConfirmDelete(false);
    onClose();
    router.refresh();
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={pattern ? "Upravit vzor" : "Nový vzor střídání"}
        size="lg"
        footer={
          <>
            {pattern ? (
              <Button variant="ghost" className="text-danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Zrušit
            </Button>
            <Button className="flex-1" onClick={save} disabled={busy}>
              {busy ? <Spinner /> : "Uložit"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}

          <div className="space-y-2">
            {(Object.keys(PATTERN_LABELS) as PatternKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => set("kind", k)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  form.kind === k
                    ? "border-brand bg-brand-soft"
                    : "border-line-strong hover:bg-surface-2"
                }`}
              >
                <span className="block text-sm font-medium text-ink">{PATTERN_LABELS[k]}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">{PATTERN_HINTS[k]}</span>
              </button>
            ))}
          </div>

          <Field label="Pro které dítě" hint="prázdné = pro všechny">
            <Select value={form.child_id} onChange={(e) => set("child_id", e.target.value)}>
              <option value="">Všechny děti</option>
              {session.children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Platí od" required>
              <Input
                type="date"
                value={form.starts_on}
                onChange={(e) => set("starts_on", e.target.value)}
              />
            </Field>
            <Field label="Platí do" hint="nepovinné">
              <Input
                type="date"
                value={form.ends_on}
                onChange={(e) => set("ends_on", e.target.value)}
              />
            </Field>
          </div>

          {form.kind === "iso_week_parity" ? (
            <>
              <Field
                label="Sudý týden mají děti u"
                hint="lichý týden pak automaticky u druhého rodiče"
              >
                <Select
                  value={form.anchor_side}
                  onChange={(e) => set("anchor_side", e.target.value as CustodySide)}
                >
                  <option value="a">Strana A — {sideLabel(session.members, "a")}</option>
                  <option value="b">Strana B — {sideLabel(session.members, "b")}</option>
                </Select>
              </Field>
              <WeekParityHint side={form.anchor_side} session={session} />
            </>
          ) : form.kind === "custom_weekly" ? (
            <>
              <Field label="Rozpis dnů" hint="klikni na den a přepni stranu">
                <WeeklyMapEditor
                  value={form.weekly_map}
                  onChange={(v) => set("weekly_map", v)}
                  labelA={sideLabel(session.members, "a")}
                  labelB={sideLabel(session.members, "b")}
                  colorA={sideColor(session.members, "a")}
                  colorB={sideColor(session.members, "b")}
                />
              </Field>

              {form.weekly_map.length === 14 ? (
                <Field
                  label="Prvním týdnem cyklu je týden, do kterého padá"
                  hint="stačí libovolný den z toho týdne"
                >
                  <Input
                    type="date"
                    value={form.anchor_date}
                    onChange={(e) => set("anchor_date", e.target.value)}
                  />
                </Field>
              ) : null}
            </>
          ) : form.kind === "fixed_parent" ? (
            <Field label="Děti jsou trvale u">
              <Select
                value={form.fixed_side}
                onChange={(e) => set("fixed_side", e.target.value as CustodySide)}
              >
                <option value="a">Strana A — {sideLabel(session.members, "a")}</option>
                <option value="b">Strana B — {sideLabel(session.members, "b")}</option>
              </Select>
            </Field>
          ) : (
            <>
              <Field
                label="Začátek prvního cyklu"
                hint="pondělí, od kterého se cyklus počítá"
              >
                <Input
                  type="date"
                  value={form.anchor_date}
                  onChange={(e) => set("anchor_date", e.target.value)}
                />
              </Field>
              <Field label="Kdo má děti v prvním cyklu">
                <Select
                  value={form.anchor_side}
                  onChange={(e) => set("anchor_side", e.target.value as CustodySide)}
                >
                  <option value="a">Strana A — {sideLabel(session.members, "a")}</option>
                  <option value="b">Strana B — {sideLabel(session.members, "b")}</option>
                </Select>
              </Field>
            </>
          )}

          <Field label="Poznámka" hint="např. odkaz na rozsudek">
            <Input value={form.note} onChange={(e) => set("note", e.target.value)} />
          </Field>
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        busy={busy}
        title="Smazat vzor?"
        message="Dny, které z něj vycházely, zůstanou v kalendáři neurčené."
      />
    </>
  );
}

function empty() {
  const monday = toDateKey(startOfWeek(new Date(), WEEK_OPTS));
  return {
    kind: "iso_week_parity" as PatternKind,
    child_id: "",
    starts_on: monday,
    ends_on: "",
    anchor_date: monday,
    anchor_side: "a" as CustodySide,
    weekly_map: "aabbaab",
    fixed_side: "a" as CustodySide,
    note: "",
  };
}

/** Ukáže, jaké číslo má právě probíhající týden a u koho tedy děti jsou. */
function WeekParityHint({
  side,
  session,
}: {
  side: CustodySide;
  session: SessionContext;
}) {
  const { week, even } = currentWeekInfo();
  const whoNow = even ? side : side === "a" ? "b" : "a";

  return (
    <div className="rounded-xl bg-surface-2 p-3 text-sm">
      <p className="text-ink-muted">
        Tento týden je <strong className="text-ink">{week}.</strong> — tedy{" "}
        <strong className="text-ink">{even ? "sudý" : "lichý"}</strong>.
      </p>
      <p className="mt-1 flex items-center gap-2 text-ink-muted">
        <Dot color={sideColor(session.members, whoNow)} />
        Podle tohoto nastavení má děti{" "}
        <strong className="text-ink">{sideLabel(session.members, whoNow)}</strong>.
      </p>
    </div>
  );
}

/**
 * Upozornění na týdny, kde kvůli 53týdennímu roku připadnou dva stejné
 * týdny za sebou. Rodina si je může ošetřit výjimkou v kalendáři.
 */
function DoubleWeekWarning() {
  const upcoming = findDoubleWeeks(new Date(), 24);
  if (upcoming.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--flag-rule,transparent)] bg-warning-soft p-3.5">
      <p className="flex items-start gap-2 text-sm font-medium text-warning">
        <CalendarRange className="mt-0.5 h-4 w-4 shrink-0" />
        Pozor na přelom roku
      </p>
      <p className="mt-1.5 text-sm text-ink-muted">
        {upcoming.length === 1 ? "Jednou" : `${upcoming.length}×`} v nejbližších dvou letech
        naváže stejná parita týdne sama na sebe — rok má 53 týdnů. Jeden rodič by tak měl děti{" "}
        <strong className="text-ink">dva týdny v kuse</strong>:
      </p>
      <ul className="mt-2 space-y-1">
        {upcoming.map((day) => (
          <li key={day} className="text-sm text-ink">
            týden od <strong>{formatDay(day)}</strong>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-subtle">
        Není to chyba, ale vlastnost střídání podle čísla týdne. Domluvte se, kdo tento týden
        vezme, a přepište ho v kalendáři klikem na den.
      </p>
    </div>
  );
}
