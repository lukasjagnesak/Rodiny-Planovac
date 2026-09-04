"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sheet, ConfirmSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert, ColorPicker, Spinner } from "@/components/ui/misc";
import { COLOR_PALETTE, PRICE_PERIODS } from "@/lib/constants";
import { DOW_LONG, DOW_ORDER, toDateKey } from "@/lib/dates";
import { formatMoney, hlaskaChyby } from "@/lib/format";
import type { Activity, SessionContext } from "@/lib/types";

const EMPTY = {
  child_id: "",
  name: "",
  location: "",
  address: "",
  day_of_week: 1,
  starts_at: "16:00",
  ends_at: "17:00",
  season_start: toDateKey(new Date()),
  season_end: "",
  price: "",
  price_period: "season",
  paid_by: "",
  split_percent: "50",
  contact: "",
  color: COLOR_PALETTE[3],
  notes: "",
  active: true,
};

export function ActivityForm({
  open,
  onClose,
  session,
  activity,
}: {
  open: boolean;
  onClose: () => void;
  session: SessionContext;
  activity: Activity | null;
}) {
  const router = useRouter();
  const [form, setForm] = React.useState(EMPTY);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [zapsano, setZapsano] = React.useState(false);

  const cenaCislo = Number(form.price) || 0;
  const podilDruheho = (cenaCislo * Number(form.split_percent)) / 100;

  // Při otevření naplníme formulář — buď z upravovaného kroužku, nebo výchozími hodnotami.
  React.useEffect(() => {
    if (!open) return;
    // Jinak by u dalšího kroužku svítilo „Zapsáno“ z toho předchozího.
    setZapsano(false);
    if (activity) {
      setForm({
        child_id: activity.child_id,
        name: activity.name,
        location: activity.location ?? "",
        address: activity.address ?? "",
        day_of_week: activity.day_of_week,
        starts_at: activity.starts_at.slice(0, 5),
        ends_at: activity.ends_at.slice(0, 5),
        season_start: activity.season_start,
        season_end: activity.season_end ?? "",
        price: activity.price ? String(activity.price) : "",
        price_period: activity.price_period ?? "season",
        paid_by: activity.paid_by ?? "",
        split_percent: String(activity.split_percent ?? 50),
        contact: activity.contact ?? "",
        color: activity.color,
        notes: activity.notes ?? "",
        active: activity.active,
      });
    } else {
      setForm({ ...EMPTY, child_id: session.children[0]?.id ?? "" });
    }
    setError(null);
  }, [open, activity, session.children]);

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (!form.child_id) {
      setError("Nejdřív přidej dítě v sekci Děti a rodina.");
      return;
    }
    if (form.ends_at <= form.starts_at) {
      setError("Konec musí být po začátku.");
      return;
    }

    setBusy(true);
    setError(null);
    const supabase = createClient();

    const payload = {
      family_id: session.family.id,
      child_id: form.child_id,
      name: form.name.trim(),
      location: form.location.trim() || null,
      address: form.address.trim() || null,
      day_of_week: Number(form.day_of_week),
      starts_at: form.starts_at,
      ends_at: form.ends_at,
      season_start: form.season_start,
      season_end: form.season_end || null,
      price: form.price ? Number(form.price) : 0,
      price_period: form.price_period,
      paid_by: form.paid_by || null,
      split_percent: Number(form.split_percent),
      contact: form.contact.trim() || null,
      color: form.color,
      notes: form.notes.trim() || null,
      active: form.active,
    };

    const { error } = activity
      ? await supabase.from("activities").update(payload).eq("id", activity.id)
      : await supabase.from("activities").insert(payload);

    setBusy(false);
    if (error) {
      setError(hlaskaChyby(error));
      return;
    }
    onClose();
    router.refresh();
  }

  /**
   * Zapíše zaplacené období jako běžný výdaj navázaný na kroužek.
   *
   * Schválně to není automatické při uložení kroužku: cena za sezónu se
   * platí jednou, ale kroužek se upravuje pořád, a z každé úpravy by
   * vznikl další výdaj.
   */
  async function zapisPlatbu() {
    if (!activity || cenaCislo <= 0) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: potiz } = await supabase.from("expenses").insert({
      family_id: session.family.id,
      child_id: activity.child_id,
      category: "activities",
      title: activity.name,
      amount: cenaCislo,
      currency: session.family.currency,
      spent_on: new Date().toISOString().slice(0, 10),
      paid_by: form.paid_by || null,
      split_percent: Number(form.split_percent),
      activity_id: activity.id,
      note: PRICE_PERIODS[form.price_period as keyof typeof PRICE_PERIODS] ?? null,
      created_by: session.userId,
    });

    setBusy(false);
    if (potiz) {
      setError(potiz.message);
      return;
    }
    setZapsano(true);
    router.refresh();
  }

  async function remove() {
    if (!activity) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("activities").delete().eq("id", activity.id);
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
        title={activity ? "Upravit kroužek" : "Nový kroužek"}
        description="Opakuje se každý týden ve zvolený den."
        size="lg"
        footer={
          <>
            {activity ? (
              <Button
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                className="text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Zrušit
            </Button>
            <Button className="flex-1" onClick={save} disabled={busy || !form.name.trim()}>
              {busy ? <Spinner /> : "Uložit"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}

          <Field label="Název" required>
            <Input
              placeholder="Fotbal, klavír, keramika…"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>

          <Field label="Dítě" required>
            <Select value={form.child_id} onChange={(e) => set("child_id", e.target.value)}>
              {session.children.length === 0 ? <option value="">Nejdřív přidej dítě</option> : null}
              {session.children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Den" className="col-span-3 sm:col-span-1">
              <Select
                value={form.day_of_week}
                onChange={(e) => set("day_of_week", Number(e.target.value))}
              >
                {DOW_ORDER.map((d) => (
                  <option key={d} value={d}>
                    {DOW_LONG[d]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Od">
              <Input
                type="time"
                value={form.starts_at}
                onChange={(e) => set("starts_at", e.target.value)}
              />
            </Field>
            <Field label="Do">
              <Input
                type="time"
                value={form.ends_at}
                onChange={(e) => set("ends_at", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Místo" hint="uvidíš u připomínky">
            <Input
              placeholder="ZŠ Komenského, tělocvična"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </Field>

          <Field label="Adresa" hint="nepovinné">
            <Input
              placeholder="Komenského 12, Brno"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Chodí od">
              <Input
                type="date"
                value={form.season_start}
                onChange={(e) => set("season_start", e.target.value)}
              />
            </Field>
            <Field label="Chodí do" hint="nepovinné">
              <Input
                type="date"
                value={form.season_end}
                onChange={(e) => set("season_end", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cena">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="0"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
              />
            </Field>
            <Field label="Za období">
              <Select
                value={form.price_period}
                onChange={(e) => set("price_period", e.target.value)}
              >
                {Object.entries(PRICE_PERIODS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Kroužky jsou jedna z největších pravidelných položek. Bez
              rozdělení se cena nikam nepočítala a v přehledu výdajů
              chyběla. */}
          {cenaCislo > 0 ? (
            <>
              <Field label="Kdo kroužek platí">
                <Select value={form.paid_by} onChange={(e) => set("paid_by", e.target.value)}>
                  <option value="">Zatím nikdo</option>
                  {session.members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Podíl druhého rodiče"
                hint={`${form.split_percent} % = ${formatMoney(podilDruheho, session.family.currency)}`}
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

              {activity ? (
                <div className="rounded-xl border border-line bg-surface-2 p-3">
                  <p className="text-sm text-ink-muted">
                    Zaplacené období zapiš do výdajů — jinak se do přehledu ani do
                    vyrovnání mezi rodiči nepromítne.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-3 w-full"
                    disabled={busy}
                    onClick={zapisPlatbu}
                  >
                    {zapsano
                      ? "Zapsáno do výdajů"
                      : `Zapsat platbu ${formatMoney(cenaCislo, session.family.currency)}`}
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}

          <Field label="Kontakt na vedoucího" hint="nepovinné">
            <Input
              placeholder="Jana Nováková, 777 123 456"
              value={form.contact}
              onChange={(e) => set("contact", e.target.value)}
            />
          </Field>

          <Field label="Barva v kalendáři">
            <ColorPicker
              value={form.color}
              palette={COLOR_PALETTE}
              onChange={(c) => set("color", c)}
            />
          </Field>

          <Field label="Poznámka">
            <Textarea
              placeholder="Nosit cvičky a láhev na pití"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>

          <Checkbox
            label="Kroužek je aktivní"
            description="Vypnutý kroužek zmizí z kalendáře, ale historie zůstane."
            checked={form.active}
            onChange={(e) => set("active", e.target.checked)}
          />
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        busy={busy}
        title="Smazat kroužek?"
        message="Smažou se i přiřazení řidičů k jednotlivým termínům. Výdaje zůstanou zachovány."
      />
    </>
  );
}
