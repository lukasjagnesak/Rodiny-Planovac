"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { addMonths, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { cs } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Plus,
  Scale,
  Wallet,
} from "lucide-react";
import { Card, CardBody, CardHeader, StatTile } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Segmented } from "@/components/ui/misc";
import { ExpenseForm } from "./expense-form";
import { CategoryDonut, MonthlyTrend } from "./expense-charts";
import { ReceiptImage, ReceiptLightbox } from "./receipt-image";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatDayShort, formatMonth, toDateKey } from "@/lib/dates";
import { cn, formatMoney } from "@/lib/format";
import { memberName } from "@/lib/members";
import type { Expense, ExpenseCategory, SessionContext } from "@/lib/types";

export function ExpensesScreen({
  session,
  expenses,
  monthKey,
  prefillDate,
}: {
  session: SessionContext;
  expenses: Expense[];
  monthKey: string;
  prefillDate: string | null;
}) {
  const router = useRouter();
  const [childFilter, setChildFilter] = React.useState<string>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<ExpenseCategory | "all">("all");
  const [formOpen, setFormOpen] = React.useState(Boolean(prefillDate));
  const [editing, setEditing] = React.useState<Expense | null>(null);
  const [lightbox, setLightbox] = React.useState<{ path: string; mime: string | null } | null>(
    null,
  );

  const anchor = parseISO(`${monthKey}-01T00:00:00`);
  const currency = session.family.currency;
  const canEdit = session.myMembership.role !== "viewer";

  /** Výdaje spadající do zobrazeného měsíce. */
  const monthExpenses = React.useMemo(
    () => expenses.filter((e) => e.spent_on.slice(0, 7) === monthKey),
    [expenses, monthKey],
  );

  const filtered = React.useMemo(
    () =>
      monthExpenses.filter((e) => {
        if (childFilter === "all") return true;
        if (childFilter === "shared") return e.child_id === null;
        return e.child_id === childFilter;
      }),
    [monthExpenses, childFilter],
  );

  const visible = React.useMemo(
    () => (categoryFilter === "all" ? filtered : filtered.filter((e) => e.category === categoryFilter)),
    [filtered, categoryFilter],
  );

  const total = visible.reduce((sum, e) => sum + Number(e.amount), 0);

  /** Kolik komu zbývá doplatit z nevypořádaných výdajů. */
  const balance = React.useMemo(() => {
    let value = 0;
    for (const e of monthExpenses) {
      if (e.settled) continue;
      const share = (Number(e.amount) * Number(e.split_percent)) / 100;
      if (e.paid_by === session.userId) value += share;
      else if (e.paid_by) value -= share;
    }
    return value;
  }, [monthExpenses, session.userId]);

  const perChild = React.useMemo(
    () =>
      session.children.map((c) => ({
        child: c,
        total: monthExpenses
          .filter((e) => e.child_id === c.id)
          .reduce((sum, e) => sum + Number(e.amount), 0),
      })),
    [monthExpenses, session.children],
  );

  const categoryData = React.useMemo(() => {
    const map = new Map<ExpenseCategory, number>();
    for (const e of filtered) {
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    }
    return [...map.entries()]
      .map(([category, value]) => ({
        name: EXPENSE_CATEGORIES[category].label,
        value,
        color: EXPENSE_CATEGORIES[category].color,
        category,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const trend = React.useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(anchor, 5 - i));
    return months.map((m) => {
      const key = toDateKey(startOfMonth(m)).slice(0, 7);
      return {
        month: key,
        label: format(m, "LLL", { locale: cs }),
        total: expenses
          .filter((e) => e.spent_on.slice(0, 7) === key)
          .filter((e) => (childFilter === "all" ? true : e.child_id === childFilter))
          .reduce((sum, e) => sum + Number(e.amount), 0),
      };
    });
  }, [expenses, anchor, childFilter]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of visible) {
      const list = map.get(e.spent_on) ?? [];
      list.push(e);
      map.set(e.spent_on, list);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [visible]);

  function goMonth(offset: number) {
    router.push(`/vydaje?m=${toDateKey(startOfMonth(addMonths(anchor, offset))).slice(0, 7)}`);
  }

  return (
    <div className="space-y-4">
      {/* ── Hlavička ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold capitalize tracking-tight text-ink sm:text-2xl">
            {formatMonth(anchor)}
          </h1>
          <p className="tnum text-sm text-ink-muted">
            {formatMoney(total, currency)} · {visible.length} záznamů
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goMonth(-1)}
            aria-label="Předchozí měsíc"
            className="rounded-xl border border-line-strong bg-surface p-2.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => goMonth(1)}
            aria-label="Další měsíc"
            className="rounded-xl border border-line-strong bg-surface p-2.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Souhrn ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Celkem za měsíc"
          value={<span className="tnum">{formatMoney(total, currency)}</span>}
          icon={<Wallet className="h-3.5 w-3.5" />}
          accent="var(--brand)"
        />
        <StatTile
          label={balance >= 0 ? "Mně dluží" : "Já dlužím"}
          value={
            <span className={cn("tnum", balance >= 0 ? "text-success" : "text-danger")}>
              {formatMoney(Math.abs(balance), currency)}
            </span>
          }
          hint="z nevypořádaných výdajů"
          icon={<Scale className="h-3.5 w-3.5" />}
          accent={balance >= 0 ? "var(--success)" : "var(--danger)"}
        />
      </div>

      {perChild.length > 0 ? (
        <Card>
          <CardHeader title="Útrata podle dětí" />
          <CardBody className="space-y-2.5 pt-3">
            {perChild.map(({ child, total: childTotal }) => {
              const max = Math.max(...perChild.map((p) => p.total), 1);
              return (
                <div key={child.id}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <Dot color={child.color} />
                      <span className="truncate text-ink">{child.name}</span>
                    </span>
                    <span className="tnum shrink-0 font-medium text-ink">
                      {formatMoney(childTotal, currency)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(childTotal / max) * 100}%`,
                        backgroundColor: child.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader title="Vývoj za 6 měsíců" />
          <CardBody className="pt-2">
            <MonthlyTrend data={trend} currency={currency} highlight={monthKey} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Podle kategorií" />
          <CardBody className="pt-2">
            {categoryData.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-subtle">Zatím nic k zobrazení.</p>
            ) : (
              <>
                <CategoryDonut data={categoryData} currency={currency} />
                <ul className="mt-3 space-y-1.5">
                  {categoryData.slice(0, 5).map((c) => (
                    <li key={c.name} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <Dot color={c.color} />
                        <span className="truncate text-ink-muted">{c.name}</span>
                      </span>
                      <span className="tnum shrink-0 text-ink">
                        {formatMoney(c.value, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ── Filtry ─────────────────────────────────────────────── */}
      <div className="space-y-2">
        {session.children.length > 0 ? (
          <Segmented
            value={childFilter}
            onChange={setChildFilter}
            options={[
              { value: "all", label: "Vše" },
              ...session.children.map((c) => ({
                value: c.id,
                label: (
                  <span className="flex items-center gap-1.5">
                    <Dot color={c.color} /> {c.name}
                  </span>
                ),
              })),
              { value: "shared", label: "Společné" },
            ]}
          />
        ) : null}

        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={cn(
              "shrink-0 rounded-pill border px-3 py-1.5 text-sm transition-colors",
              categoryFilter === "all"
                ? "border-ink bg-ink text-canvas"
                : "border-line-strong text-ink-muted",
            )}
          >
            Všechny kategorie
          </button>
          {categoryData.map((c) => (
            <button
              key={c.category}
              type="button"
              onClick={() =>
                setCategoryFilter((prev) => (prev === c.category ? "all" : c.category))
              }
              className="flex shrink-0 items-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm transition-colors"
              style={
                categoryFilter === c.category
                  ? { backgroundColor: `${c.color}22`, borderColor: c.color, color: c.color }
                  : { borderColor: "var(--line-strong)" }
              }
            >
              {EXPENSE_CATEGORIES[c.category].emoji} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Seznam ─────────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wallet className="h-6 w-6" />}
            title="Žádné výdaje v tomto měsíci"
            description="Přidej výdaj i s fotkou účtenky — druhý rodič ho hned uvidí."
            action={
              canEdit ? (
                <Button
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" /> Přidat výdaj
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {grouped.map(([day, list]) => (
            <Card key={day}>
              <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-2">
                <span className="text-sm font-medium text-ink">{formatDayShort(day)}</span>
                <span className="tnum text-sm text-ink-muted">
                  {formatMoney(
                    list.reduce((s, e) => s + Number(e.amount), 0),
                    currency,
                  )}
                </span>
              </div>

              <ul className="divide-y divide-line">
                {list.map((e) => {
                  const meta = EXPENSE_CATEGORIES[e.category];
                  const child = session.children.find((c) => c.id === e.child_id);
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => {
                          setEditing(e);
                          setFormOpen(true);
                        }}
                        className="flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-surface-2 disabled:cursor-default"
                      >
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                          style={{ backgroundColor: `${meta.color}1f` }}
                          aria-hidden
                        >
                          {meta.emoji}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate font-medium text-ink">{e.title}</span>
                            {child ? <Badge color={child.color}>{child.name}</Badge> : null}
                            {e.settled ? <Badge color="var(--success)">vypořádáno</Badge> : null}
                          </span>
                          <span className="mt-0.5 flex items-center gap-2 text-xs text-ink-muted">
                            <span>{meta.label}</span>
                            <span>·</span>
                            <span>platil {memberName(session.members, e.paid_by)}</span>
                            {(e.receipts?.length ?? 0) > 0 ? (
                              <>
                                <span>·</span>
                                <Paperclip className="h-3 w-3" />
                              </>
                            ) : null}
                          </span>
                        </span>

                        <span className="tnum shrink-0 font-semibold text-ink">
                          {formatMoney(Number(e.amount), currency)}
                        </span>
                      </button>

                      {(e.receipts?.length ?? 0) > 0 ? (
                        <div className="flex gap-2 px-3.5 pb-3">
                          {e.receipts!.map((r) => (
                            <ReceiptImage
                              key={r.id}
                              path={r.storage_path}
                              mimeType={r.mime_type}
                              className="h-14 w-14 rounded-lg border border-line"
                              onClick={() =>
                                setLightbox({ path: r.storage_path, mime: r.mime_type })
                              }
                            />
                          ))}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {/* Plovoucí tlačítko na mobilu */}
      {canEdit ? (
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          aria-label="Přidat výdaj"
          className="fixed bottom-[76px] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-ink shadow-[var(--shadow-pop)] transition-transform active:scale-95 lg:bottom-6 lg:right-6"
        >
          <Plus className="h-6 w-6" />
        </button>
      ) : null}

      <ExpenseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        session={session}
        expense={editing}
        defaultDate={editing ? null : prefillDate}
      />

      {lightbox ? (
        <ReceiptLightbox
          path={lightbox.path}
          mimeType={lightbox.mime}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </div>
  );
}
