"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sheet, ConfirmSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert, Spinner } from "@/components/ui/misc";
import { EVENT_KINDS, EVENT_KIND_ORDER, REMINDER_CHOICES } from "@/lib/constants";
import { toDateKey } from "@/lib/dates";
import type { EventKind, FamilyEvent, SessionContext } from "@/lib/types";
import { hlaskaChyby } from "@/lib/format";

export function EventForm({
  open,
  onClose,
  session,
  event,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  session: SessionContext;
  event: FamilyEvent | null;
  defaultDate?: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = React.useState(() => emptyForm(defaultDate));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (event) {
      const start = new Date(event.starts_at);
      const end = event.ends_at ? new Date(event.ends_at) : null;
      setForm({
        kind: event.kind,
        title: event.title,
        child_id: event.child_id ?? "",
        location: event.location ?? "",
        date: toDateKey(start),
        time: event.all_day ? "09:00" : toLocalTime(start),
        end_date: end ? toDateKey(end) : "",
        end_time: end && !event.all_day ? toLocalTime(end) : "",
        all_day: event.all_day,
        responsible: event.responsible ?? "",
        reminders: event.reminders ?? [1440],
        notes: event.notes ?? "",
      });
    } else {
      setForm(emptyForm(defaultDate));
    }
    setError(null);
  }, [open, event, defaultDate]);

  function set<K extends keyof ReturnType<typeof emptyForm>>(
    key: K,
    value: ReturnType<typeof emptyForm>[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (!form.title.trim()) {
      setError("Doplň název události.");
      return;
    }

    setBusy(true);
    setError(null);
    const supabase = createClient();

    // Datum a čas skládáme v lokální zóně, do DB jde ISO s posunem.
    const startsAt = form.all_day
      ? new Date(`${form.date}T00:00:00`)
      : new Date(`${form.date}T${form.time || "09:00"}:00`);

    let endsAt: Date | null = null;
    if (form.all_day && form.end_date) {
      endsAt = new Date(`${form.end_date}T23:59:00`);
    } else if (!form.all_day && form.end_time) {
      endsAt = new Date(`${form.end_date || form.date}T${form.end_time}:00`);
    }

    if (endsAt && endsAt < startsAt) {
      setBusy(false);
      setError("Konec nemůže být dřív než začátek.");
      return;
    }

    const payload = {
      family_id: session.family.id,
      child_id: form.child_id || null,
      kind: form.kind,
      title: form.title.trim(),
      location: form.location.trim() || null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt ? endsAt.toISOString() : null,
      all_day: form.all_day,
      notes: form.notes.trim() || null,
      responsible: form.responsible || null,
      reminders: form.reminders,
      created_by: session.userId,
    };

    const { error } = event
      ? await supabase.from("events").update(payload).eq("id", event.id)
      : await supabase.from("events").insert(payload);

    setBusy(false);
    if (error) {
      setError(hlaskaChyby(error));
      return;
    }
    onClose();
    router.refresh();
  }

  async function remove() {
    if (!event) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    setBusy(false);
    if (error) {
      setError(hlaskaChyby(error));
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
        title={event ? "Upravit událost" : "Nová událost"}
        size="lg"
        footer={
          <>
            {event ? (
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

          <Field label="Typ události">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {EVENT_KIND_ORDER.map((k) => {
                const meta = EVENT_KINDS[k];
                const active = form.kind === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => set("kind", k)}
                    className="flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center text-xs transition-colors"
                    style={
                      active
                        ? {
                            backgroundColor: `${meta.color}1f`,
                            borderColor: meta.color,
                            color: meta.color,
                            fontWeight: 600,
                          }
                        : { borderColor: "var(--line-strong)" }
                    }
                  >
                    <span className="text-base" aria-hidden>
                      {meta.emoji}
                    </span>
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Název" required>
            <Input
              placeholder={EVENT_KINDS[form.kind].label}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </Field>

          <Field label="Koho se týká" hint="prázdné = celá rodina">
            <Select value={form.child_id} onChange={(e) => set("child_id", e.target.value)}>
              <option value="">Celá rodina</option>
              {session.children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Checkbox
            label="Celodenní"
            description="Pro školu v přírodě nebo prázdniny."
            checked={form.all_day}
            onChange={(e) => set("all_day", e.target.checked)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Začátek">
              <Input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </Field>
            {!form.all_day ? (
              <Field label="Čas">
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => set("time", e.target.value)}
                />
              </Field>
            ) : (
              <Field label="Konec" hint="nepovinné">
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => set("end_date", e.target.value)}
                />
              </Field>
            )}
          </div>

          {!form.all_day ? (
            <Field label="Konec" hint="nepovinné">
              <Input
                type="time"
                value={form.end_time}
                onChange={(e) => set("end_time", e.target.value)}
              />
            </Field>
          ) : null}

          <Field label="Místo">
            <Input
              placeholder="MUDr. Nováková, Hlavní 5"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </Field>

          <Field label="Kdo se postará / veze" hint="dostane připomínku">
            <Select value={form.responsible} onChange={(e) => set("responsible", e.target.value)}>
              <option value="">Nepřiřazeno</option>
              {session.members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Připomenout" hint="pošleme na Telegram">
            <div className="flex flex-wrap gap-1.5">
              {REMINDER_CHOICES.map((r) => {
                const active = form.reminders.includes(r.value);
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() =>
                      set(
                        "reminders",
                        active
                          ? form.reminders.filter((v) => v !== r.value)
                          : [...form.reminders, r.value].sort((a, b) => b - a),
                      )
                    }
                    className={`rounded-pill border px-3 py-1.5 text-sm transition-colors ${
                      active
                        ? "border-brand bg-brand-soft font-medium text-brand"
                        : "border-line-strong text-ink-muted"
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Poznámka">
            <Textarea
              placeholder="Vzít kartičku pojišťovny"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        busy={busy}
        title="Smazat událost?"
        message="Zmizí z kalendáře i z připomínek."
      />
    </>
  );
}

function emptyForm(defaultDate?: string | null) {
  return {
    kind: "medical" as EventKind,
    title: "",
    child_id: "",
    location: "",
    date: defaultDate ?? toDateKey(new Date()),
    time: "09:00",
    end_date: "",
    end_time: "",
    all_day: false,
    responsible: "",
    reminders: [1440] as number[],
    notes: "",
  };
}

function toLocalTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
