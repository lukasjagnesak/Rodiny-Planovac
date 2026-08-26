"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Check,
  CalendarPlus,
  EyeOff,
  GraduationCap,
  Mail,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Alert, EmptyState, Segmented } from "@/components/ui/misc";
import { formatDayShort, formatDateTime, relativeDayLabel, toDateKey } from "@/lib/dates";
import { cn } from "@/lib/format";
import type { EdupageDruh, SessionContext } from "@/lib/types";

export interface EdupageRow {
  id: string;
  child_id: string | null;
  druh: EdupageDruh;
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

const DRUH: Record<EdupageDruh, { label: string; color: string }> = {
  ukol: { label: "Úkol", color: "#3f74e0" },
  pisemka: { label: "Písemka", color: "#c2453d" },
  zprava: { label: "Zpráva", color: "#2f6f5e" },
  akce: { label: "Akce školy", color: "#b5761b" },
};

type Zalozka = "aktivni" | "zpravy" | "vse";

export function HomeworkScreen({
  session,
  items,
}: {
  session: SessionContext;
  items: EdupageRow[];
}) {
  const router = useRouter();
  const [zalozka, setZalozka] = React.useState<Zalozka>("aktivni");
  const [dite, setDite] = React.useState<string>("vse");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const today = toDateKey(new Date());
  const canEdit = session.myMembership.role !== "viewer";

  // Filtr podle dítěte se ukazuje jen tehdy, když je co třídit.
  const deti = session.children.filter((c) => !c.archived);
  const maViceDeti = deti.length > 1;

  const podleDitete = React.useMemo(() => {
    if (dite === "vse") return items;
    if (dite === "bez") return items.filter((i) => i.child_id === null);
    return items.filter((i) => i.child_id === dite);
  }, [items, dite]);

  const pocetZprav = podleDitete.filter((i) => i.druh === "zprava").length;

  const visible = React.useMemo(() => {
    if (zalozka === "zpravy") {
      // Zprávy dávají smysl od nejnovější.
      return podleDitete
        .filter((i) => i.druh === "zprava")
        .sort((a, b) => (b.zadano ?? "").localeCompare(a.zadano ?? ""));
    }

    const vybrane =
      zalozka === "vse"
        ? podleDitete
        : // Aktivní = úkoly a akce, které ještě někoho čekají.
          podleDitete.filter(
            (i) => i.druh !== "zprava" && !i.hotovo && (!i.termin || i.termin >= today),
          );

    // Nejdřív to, co má termín, a to nejbližší nahoře.
    return [...vybrane].sort((a, b) => {
      if (a.termin && b.termin) return a.termin.localeCompare(b.termin);
      if (a.termin) return -1;
      if (b.termin) return 1;
      return (b.zadano ?? "").localeCompare(a.zadano ?? "");
    });
  }, [podleDitete, zalozka, today]);

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
        child_id: row.child_id,
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
            Ze školy
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

      {maViceDeti ? (
        <Segmented
          value={dite}
          onChange={setDite}
          options={[
            { value: "vse", label: "Všechny děti" },
            ...deti.map((c) => ({
              value: c.id,
              label: (
                <span className="flex items-center gap-1.5">
                  <Dot color={c.color} /> {c.name}
                </span>
              ),
            })),
            { value: "bez", label: "Nepřiřazeno" },
          ]}
        />
      ) : null}

      <Segmented
        value={zalozka}
        onChange={setZalozka}
        options={[
          { value: "aktivni", label: "Úkoly a akce" },
          { value: "zpravy", label: `Zprávy (${pocetZprav})` },
          { value: "vse", label: `Vše (${podleDitete.length})` },
        ]}
      />

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={
              zalozka === "zpravy" ? (
                <Mail className="h-6 w-6" />
              ) : (
                <BookOpen className="h-6 w-6" />
              )
            }
            title={items.length === 0 ? "Zatím nic staženo" : "Nic tu není"}
            description={
              items.length === 0
                ? "Propoj EduPage v nastavení a stáhni úkoly."
                : zalozka === "zpravy"
                  ? "Žádné zprávy od školy."
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
          {visible.map((row) => (
            <PolozkaCard
              key={row.id}
              row={row}
              deti={deti}
              canEdit={canEdit}
              busy={busy === row.id}
              today={today}
              ukazDite={maViceDeti}
              onToggle={() => toggleDone(row)}
              onHide={() => hide(row)}
              onCalendar={() => toCalendar(row)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function PolozkaCard({
  row,
  deti,
  canEdit,
  busy,
  today,
  ukazDite,
  onToggle,
  onHide,
  onCalendar,
}: {
  row: EdupageRow;
  deti: SessionContext["children"];
  canEdit: boolean;
  busy: boolean;
  today: string;
  ukazDite: boolean;
  onToggle: () => void;
  onHide: () => void;
  onCalendar: () => void;
}) {
  const meta = DRUH[row.druh];
  const overdue = row.termin && row.termin < today && !row.hotovo;
  const jeZprava = row.druh === "zprava";
  const dite = deti.find((c) => c.id === row.child_id);

  return (
    <li>
      <Card
        className={cn("p-4", row.hotovo && "opacity-60")}
        style={{ borderLeft: `3px solid ${meta.color}` }}
      >
        <div className="flex items-start gap-3">
          {/* U zprávy se nic neodškrtává — jen se přečte. */}
          {canEdit && !jeZprava ? (
            <button
              type="button"
              onClick={onToggle}
              disabled={busy}
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
              {ukazDite && dite ? (
                <Badge color={dite.color}>{dite.name}</Badge>
              ) : null}
              {row.predmet ? <Badge>{row.predmet}</Badge> : null}
              {overdue ? <Badge color="var(--danger)">po termínu</Badge> : null}
            </div>

            <p
              className={cn(
                "mt-1.5 whitespace-pre-line text-sm text-ink",
                row.hotovo && !jeZprava && "line-through",
              )}
            >
              {row.text || "(bez popisu)"}
            </p>

            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-subtle">
              {jeZprava ? (
                row.zadano ? (
                  <span className="tnum">{formatDateTime(row.zadano)}</span>
                ) : null
              ) : row.termin ? (
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
                    onClick={onCalendar}
                    disabled={busy}
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
                  onClick={onHide}
                  disabled={busy}
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
}
