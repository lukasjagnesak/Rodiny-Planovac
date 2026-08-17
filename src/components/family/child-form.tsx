"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sheet, ConfirmSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Alert, ColorPicker, Spinner } from "@/components/ui/misc";
import { COLOR_PALETTE } from "@/lib/constants";
import type { Child, SessionContext } from "@/lib/types";

export function ChildForm({
  open,
  onClose,
  session,
  child,
}: {
  open: boolean;
  onClose: () => void;
  session: SessionContext;
  child: Child | null;
}) {
  const router = useRouter();
  const [form, setForm] = React.useState(empty());
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setForm(
      child
        ? {
            name: child.name,
            birth_date: child.birth_date ?? "",
            color: child.color,
            school: child.school ?? "",
            class_name: child.class_name ?? "",
            notes: child.notes ?? "",
            archived: child.archived,
          }
        : empty(),
    );
    setError(null);
  }, [open, child]);

  function set<K extends keyof ReturnType<typeof empty>>(
    key: K,
    value: ReturnType<typeof empty>[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (!form.name.trim()) {
      setError("Doplň jméno.");
      return;
    }
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const payload = {
      family_id: session.family.id,
      name: form.name.trim(),
      birth_date: form.birth_date || null,
      color: form.color,
      school: form.school.trim() || null,
      class_name: form.class_name.trim() || null,
      notes: form.notes.trim() || null,
      archived: form.archived,
    };

    const { error } = child
      ? await supabase.from("children").update(payload).eq("id", child.id)
      : await supabase.from("children").insert(payload);

    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onClose();
    router.refresh();
  }

  async function remove() {
    if (!child) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("children").delete().eq("id", child.id);
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
        title={child ? "Upravit dítě" : "Přidat dítě"}
        footer={
          <>
            {child ? (
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

          <Field label="Jméno" required>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>

          <Field label="Datum narození" hint="nepovinné">
            <Input
              type="date"
              value={form.birth_date}
              onChange={(e) => set("birth_date", e.target.value)}
            />
          </Field>

          <Field label="Barva" hint="rozliší dítě v kalendáři a výdajích">
            <ColorPicker
              value={form.color}
              palette={COLOR_PALETTE}
              onChange={(c) => set("color", c)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Škola">
              <Input
                placeholder="ZŠ Komenského"
                value={form.school}
                onChange={(e) => set("school", e.target.value)}
              />
            </Field>
            <Field label="Třída">
              <Input
                placeholder="3.B"
                value={form.class_name}
                onChange={(e) => set("class_name", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Poznámka" hint="alergie, léky, velikost oblečení…">
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>

          {child ? (
            <Checkbox
              label="Archivovat"
              description="Skryje dítě z kalendáře a výběrů, data zůstanou."
              checked={form.archived}
              onChange={(e) => set("archived", e.target.checked)}
            />
          ) : null}
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        busy={busy}
        title="Smazat dítě?"
        message="Smažou se i jeho kroužky, události a výdaje. Pokud chceš data zachovat, radši použij archivaci."
      />
    </>
  );
}

function empty() {
  return {
    name: "",
    birth_date: "",
    color: COLOR_PALETTE[2],
    school: "",
    class_name: "",
    notes: "",
    archived: false,
  };
}
