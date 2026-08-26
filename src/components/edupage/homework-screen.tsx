"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Check, CalendarPlus, EyeOff, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Alert, EmptyState, Segmented } from "@/components/ui/misc";
import { formatDayShort, relativeDayLabel, toDateKey } from "@/lib/dates";
import { cn } from "@/lib/format";
import type { SessionContext } from "@/lib/types";

export interface EdupageRow {
  id: string;
  druh: "ukol" | "pisemka" | "akce";
  typ: string | null;
  text: string;
  predmet: string | null;
  termin: string | null;
  zadano: string | null;
  hotovo: boolean;
  autor: string | null;
  navrh_kalendare: string | null;
  event_id: string | null;
}

const DRUH = {
  ukol: { label: "Úkol", color: "#3f74e0" },
  pisemka: { label: "Písemka", color: "#c2453d" },
  akce: { label: "Akce školy", color: "#b5761b" },
} as const;

export function HomeworkScreen({
  session,
  items,
}: {
  session: SessionContext;
  items: EdupageRow[];
}) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<"aktivni" | "vse">("aktivni");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const today = toDateKey(new Date());
  const canEdit = session.myMembership.role !== "viewer";

  const visible = React.useMemo(() => {
    if (filter === "vse") return items;
    // Aktivní = nesplněné a buď bez termínu, nebo termín ještě neuplynul.
    return items.filter((i) => !i.hotovo && (!i.termin || i.termin >= today));
  }, [items, filter, today]);

  async function toggleDone(row: EdupageRow) {
    setBusy(row.id);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("edupage_items")
      .update({ hotovo: !row.hotovo })
      .eq("id", row.id);
    setBusy(null);
    if (error) setError(error.message);
    else router.refresh();
  }

  async function hide(row: EdupageRow) {
    setBusy(row.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("edupage_items")
      .update({ skryto: true })
      .eq("id", row.id);
    setBusy(null);
    if (error) setError(error.message);
    else router.refresh();
  }

  /** Ze školní akce udělá událost v kalendáři. */
  async function toCalendar(row: EdupageRow) {
    if (!row.termin) return;
    setBusy(row.id);
    setError(null);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("events")
      .insert({
        family_id: session.family.id,
        kind: row.navrh_kalendare ?? "other",
        title: row.text.slice(0, 120) || "Školní akce",
        starts_at: new Date(`${row.termin}T08:00:00`).toISOString(),
        all_day: true,
        notes: row.autor ? `Z EduPage · ${row.autor}` : "Z EduPage",
        created_by: session.userId,
      })
      .select("id")
      .single();

    if (error) {
      setBusy(null);
      setError(error.message);
      return;
    }

    await supabase.from("edupage_items").update({ event_id: data.id }).eq("id", row.id);
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            Úkoly ze školy
          </h1>
          <p className="text-sm text-ink-muted">
            {visible.length} položek z EduPage
          </p>
        </div>
        <ButtonLink href="/nastaveni/edupage" variant="secondary" size="sm">
          <GraduationCap className="h-4 w-4" /> EduPage
        </ButtonLink>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: "aktivni", label: "Aktivní" },
          { value: "vse", label: `Vše (${items.length})` },
        ]}
      />

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookOpen className="h-6 w-6" />}
            title={items.length === 0 ? "Zatím nic staženo" : "Nic aktivního"}
            description={
              items.length === 0
                ? "Propoj EduPage v nastavení a stáhni úkoly."
                : "Všechno je hotové nebo už po termínu."
            }
            action={
              items.length === 0 ? (
                <ButtonLink href="/nastaveni/edupage">Propojit EduPage</ButtonLink>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {visible.map((row) => {
            const meta = DRUH[row.druh];
            const overdue = row.termin && row.termin < today && !row.hotovo;

            return (
              <li key={row.id}>
                <Card
                  className={cn("p-4", row.hotovo && "opacity-60")}
                  style={{ borderLeft: `3px solid ${meta.color}` }}
                >
                  <div className="flex items-start gap-3">
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => toggleDone(row)}
                        disabled={busy === row.id}
                        aria-label={row.hotovo ? "Označit jako nehotové" : "Označit jako hotové"}
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors",
                          row.hotovo
                            ? "border-success bg-success text-white"
                            : "border-line-strong hover:border-ink",
                        )}
                      >
                        {row.hotovo ? <Check className="h-4 w-4" /> : null}
                      </button>
                    ) : null}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge color={meta.color}>{meta.label}</Badge>
                        {row.predmet ? <Badge>{row.predmet}</Badge> : null}
                        {overdue ? <Badge color="var(--danger)">po termínu</Badge> : null}
                      </div>

                      <p
                        className={cn(
                          "mt-1.5 text-sm text-ink",
                          row.hotovo && "line-through",
                        )}
                      >
                        {row.text || "(bez popisu)"}
                      </p>

                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-subtle">
                        {row.termin ? (
                          <span className="tnum">
                            odevzdat {formatDayShort(row.termin)} · {relativeDayLabel(row.termin)}
                          </span>
                        ) : (
                          <span>bez termínu</span>
                        )}
                        {row.autor ? <span>· {row.autor}</span> : null}
                      </p>

                      {canEdit ? (
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {row.druh === "akce" && row.termin && !row.event_id ? (
                            <button
                              type="button"
                              onClick={() => toCalendar(row)}
                              disabled={busy === row.id}
                              className="flex items-center gap-1.5 rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-medium hover:bg-surface-2 disabled:opacity-50"
                            >
                              <CalendarPlus className="h-3.5 w-3.5" /> Do kalendáře
                            </button>
                          ) : null}

                          {row.event_id ? (
                            <span className="text-xs text-success">✓ v kalendáři</span>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => hide(row)}
                            disabled={busy === row.id}
                            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-ink-subtle hover:bg-surface-2 hover:text-ink disabled:opacity-50"
                          >
                            <EyeOff className="h-3.5 w-3.5" /> Skrýt
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
