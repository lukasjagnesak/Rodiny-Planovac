"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sheet, ConfirmSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert, Spinner } from "@/components/ui/misc";
import { ReceiptImage } from "./receipt-image";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_ORDER } from "@/lib/constants";
import { toDateKey } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import type { Expense, ExpenseCategory, Receipt, SessionContext } from "@/lib/types";

const MAX_FILE_BYTES = 15 * 1024 * 1024;

export function ExpenseForm({
  open,
  onClose,
  session,
  expense,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  session: SessionContext;
  expense: Expense | null;
  defaultDate?: string | null;
}) {
  const router = useRouter();
  const fileInput = React.useRef<HTMLInputElement>(null);

  const [form, setForm] = React.useState(() => emptyForm(session, defaultDate));
  const [newFiles, setNewFiles] = React.useState<File[]>([]);
  const [existingReceipts, setExistingReceipts] = React.useState<Receipt[]>([]);
  const [removedReceipts, setRemovedReceipts] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (expense) {
      setForm({
        child_id: expense.child_id ?? "",
        category: expense.category,
        title: expense.title,
        amount: String(expense.amount),
        spent_on: expense.spent_on,
        paid_by: expense.paid_by ?? session.userId,
        split_percent: String(expense.split_percent),
        settled: expense.settled,
        note: expense.note ?? "",
      });
      setExistingReceipts(expense.receipts ?? []);
    } else {
      setForm(emptyForm(session, defaultDate));
      setExistingReceipts([]);
    }
    setNewFiles([]);
    setRemovedReceipts([]);
    setError(null);
  }, [open, expense, session, defaultDate]);

  function set<K extends keyof ReturnType<typeof emptyForm>>(
    key: K,
    value: ReturnType<typeof emptyForm>[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      if (file.size > MAX_FILE_BYTES) {
        setError(`Soubor ${file.name} je větší než 15 MB.`);
        continue;
      }
      accepted.push(file);
    }
    setNewFiles((prev) => [...prev, ...accepted]);
  }

  async function save() {
    const amount = Number(form.amount.replace(",", "."));
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Zadej platnou částku.");
      return;
    }
    if (!form.title.trim()) {
      setError("Doplň, za co to bylo.");
      return;
    }

    setBusy(true);
    setError(null);
    const supabase = createClient();

    try {
      const payload = {
        family_id: session.family.id,
        child_id: form.child_id || null,
        category: form.category,
        title: form.title.trim(),
        amount,
        currency: session.family.currency,
        spent_on: form.spent_on,
        paid_by: form.paid_by || null,
        split_percent: Number(form.split_percent),
        settled: form.settled,
        note: form.note.trim() || null,
        created_by: session.userId,
      };

      let expenseId = expense?.id;

      if (expense) {
        const { error } = await supabase.from("expenses").update(payload).eq("id", expense.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("expenses")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        expenseId = data.id;
      }

      // Odebrané účtenky smažeme i ze Storage.
      if (removedReceipts.length > 0) {
        const paths = existingReceipts
          .filter((r) => removedReceipts.includes(r.id))
          .map((r) => r.storage_path);
        await supabase.storage.from("receipts").remove(paths);
        await supabase.from("receipts").delete().in("id", removedReceipts);
      }

      // Nahrání nových fotek.
      for (let i = 0; i < newFiles.length; i += 1) {
        const file = newFiles[i];
        setProgress(`Nahrávám účtenku ${i + 1} z ${newFiles.length}…`);

        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${session.family.id}/${expenseId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (uploadError) throw uploadError;

        const { error: rowError } = await supabase.from("receipts").insert({
          family_id: session.family.id,
          expense_id: expenseId,
          storage_path: path,
          mime_type: file.type || null,
          size_bytes: file.size,
          uploaded_by: session.userId,
        });
        if (rowError) throw rowError;
      }

      setProgress(null);
      setBusy(false);
      onClose();
      router.refresh();
    } catch (e) {
      setProgress(null);
      setBusy(false);
      setError(e instanceof Error ? e.message : "Uložení se nepovedlo.");
    }
  }

  async function remove() {
    if (!expense) return;
    setBusy(true);
    const supabase = createClient();

    const paths = (expense.receipts ?? []).map((r) => r.storage_path);
    if (paths.length > 0) await supabase.storage.from("receipts").remove(paths);

    const { error } = await supabase.from("expenses").delete().eq("id", expense.id);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setConfirmDelete(false);
    onClose();
    router.refresh();
  }

  const amountNumber = Number(form.amount.replace(",", ".")) || 0;
  const otherShare = (amountNumber * Number(form.split_percent)) / 100;
  const visibleReceipts = existingReceipts.filter((r) => !removedReceipts.includes(r.id));

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={expense ? "Upravit výdaj" : "Nový výdaj"}
        size="lg"
        footer={
          <>
            {expense ? (
              <Button variant="ghost" className="text-danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
            <Button variant="secondary" className="flex-1" onClick={onClose} disabled={busy}>
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
          {progress ? <Alert tone="info">{progress}</Alert> : null}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Částka" required>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0"
                className="text-lg font-semibold"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            </Field>
            <Field label="Datum">
              <Input
                type="date"
                value={form.spent_on}
                onChange={(e) => set("spent_on", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Za co" required>
            <Input
              placeholder="Zimní bunda, plavání, obědy…"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </Field>

          <Field label="Kategorie">
            <div className="flex flex-wrap gap-1.5">
              {EXPENSE_CATEGORY_ORDER.map((c) => {
                const meta = EXPENSE_CATEGORIES[c];
                const active = form.category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("category", c)}
                    className="flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm transition-colors"
                    style={
                      active
                        ? {
                            backgroundColor: `${meta.color}22`,
                            borderColor: meta.color,
                            color: meta.color,
                            fontWeight: 600,
                          }
                        : { borderColor: "var(--line-strong)" }
                    }
                  >
                    <span aria-hidden>{meta.emoji}</span>
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Pro koho" hint="prázdné = společný výdaj">
            <Select value={form.child_id} onChange={(e) => set("child_id", e.target.value)}>
              <option value="">Celá rodina</option>
              {session.children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Kdo zaplatil">
            <Select value={form.paid_by} onChange={(e) => set("paid_by", e.target.value)}>
              {session.members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Podíl druhého rodiče"
            hint={`${form.split_percent} % = ${formatMoney(otherShare, session.family.currency)}`}
          >
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={form.split_percent}
              onChange={(e) => set("split_percent", e.target.value)}
              className="w-full accent-[var(--brand)]"
            />
            <div className="flex justify-between text-xs text-ink-subtle">
              <span>vše platím já</span>
              <span>půl na půl</span>
              <span>vše platí druhý</span>
            </div>
          </Field>

          {/* ── Účtenky ──────────────────────────────────────────── */}
          <Field label="Účtenky" hint="fotka nebo PDF">
            <div className="flex flex-wrap gap-2">
              {visibleReceipts.map((r) => (
                <div key={r.id} className="relative">
                  <ReceiptImage
                    path={r.storage_path}
                    mimeType={r.mime_type}
                    className="h-20 w-20 rounded-xl border border-line"
                  />
                  <button
                    type="button"
                    aria-label="Odebrat účtenku"
                    onClick={() => setRemovedReceipts((prev) => [...prev, r.id])}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-danger p-1 text-white shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {newFiles.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-2"
                >
                  {f.type.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={URL.createObjectURL(f)}
                      alt={f.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="px-1 text-center text-[10px] text-ink-muted">{f.name}</span>
                  )}
                  <button
                    type="button"
                    aria-label="Odebrat soubor"
                    onClick={() => setNewFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-danger p-1 text-white shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line-strong text-ink-subtle transition-colors hover:border-brand hover:text-brand"
              >
                <Camera className="h-5 w-5" />
                <span className="text-[10px]">Přidat</span>
              </button>
            </div>

            <input
              ref={fileInput}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </Field>

          <Field label="Poznámka">
            <Textarea
              placeholder="Doplňující informace"
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
            />
          </Field>

          <Checkbox
            label="Vypořádáno"
            description="Druhý rodič už svůj podíl uhradil."
            checked={form.settled}
            onChange={(e) => set("settled", e.target.checked)}
          />
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        busy={busy}
        title="Smazat výdaj?"
        message="Smaže se i nahraná fotka účtenky. Tuhle akci nelze vzít zpět."
      />
    </>
  );
}

function emptyForm(session: SessionContext, defaultDate?: string | null) {
  return {
    child_id: "",
    category: "other" as ExpenseCategory,
    title: "",
    amount: "",
    spent_on: defaultDate ?? toDateKey(new Date()),
    paid_by: session.userId,
    split_percent: "50",
    settled: false,
    note: "",
  };
}
