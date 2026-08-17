"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Baby, Check, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert, ColorPicker, Spinner } from "@/components/ui/misc";
import { COLOR_PALETTE } from "@/lib/constants";
import { PATTERN_HINTS, PATTERN_LABELS } from "@/lib/custody";
import { ACTIVE_FAMILY_COOKIE } from "@/lib/members";
import { toDateKey } from "@/lib/dates";
import { startOfWeek } from "date-fns";
import { WEEK_OPTS } from "@/lib/dates";
import type { PatternKind } from "@/lib/types";

interface ChildDraft {
  name: string;
  birthDate: string;
  color: string;
}

const STEPS = ["Rodina", "Děti", "Střídání"];

export function OnboardingWizard({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [familyName, setFamilyName] = React.useState("");
  const [myName, setMyName] = React.useState(defaultName);
  const [mySide, setMySide] = React.useState<"a" | "b">("a");
  const [otherName, setOtherName] = React.useState("");

  const [children, setChildren] = React.useState<ChildDraft[]>([
    { name: "", birthDate: "", color: COLOR_PALETTE[2] },
  ]);

  const [kind, setKind] = React.useState<PatternKind>("alternating_weeks");
  const [anchorDate, setAnchorDate] = React.useState(
    toDateKey(startOfWeek(new Date(), WEEK_OPTS)),
  );
  const [anchorSide, setAnchorSide] = React.useState<"a" | "b">("a");
  const [weeklyMap, setWeeklyMap] = React.useState("aabbaab");

  const validChildren = children.filter((c) => c.name.trim().length > 0);

  async function finish() {
    setBusy(true);
    setError(null);
    const supabase = createClient();

    try {
      const { data: familyId, error: familyError } = await supabase.rpc("create_family", {
        family_name: familyName.trim(),
        my_name: myName.trim() || null,
        my_side: mySide,
      });
      if (familyError) throw familyError;

      if (validChildren.length > 0) {
        const { error: childError } = await supabase.from("children").insert(
          validChildren.map((c) => ({
            family_id: familyId,
            name: c.name.trim(),
            birth_date: c.birthDate || null,
            color: c.color,
          })),
        );
        if (childError) throw childError;
      }

      const { error: patternError } = await supabase.from("custody_patterns").insert({
        family_id: familyId,
        kind,
        starts_on: anchorDate,
        anchor_date: anchorDate,
        anchor_side: anchorSide,
        weekly_map: kind === "custom_weekly" ? weeklyMap : null,
        fixed_side: kind === "fixed_parent" ? anchorSide : null,
      });
      if (patternError) throw patternError;

      document.cookie = `${ACTIVE_FAMILY_COOKIE}=${familyId}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      router.push("/prehled");
      router.refresh();
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Něco se pokazilo, zkus to prosím znovu.");
    }
  }

  const canContinue =
    step === 0 ? familyName.trim().length > 1 && myName.trim().length > 0 : true;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 sm:py-14">
      {/* Ukazatel postupu */}
      <ol className="mb-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                i < step
                  ? "bg-brand text-brand-ink"
                  : i === step
                    ? "bg-brand-soft text-brand ring-2 ring-brand"
                    : "bg-surface-2 text-ink-subtle"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span
              className={`hidden text-sm sm:block ${i === step ? "font-medium text-ink" : "text-ink-subtle"}`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 ? <span className="h-px flex-1 bg-line" /> : null}
          </li>
        ))}
      </ol>

      <div className="card space-y-5 p-5 sm:p-6">
        {step === 0 ? (
          <>
            <div>
              <h1 className="text-lg font-semibold text-ink">Založme rodinu</h1>
              <p className="mt-1 text-sm text-ink-muted">
                Rodina je společný prostor, do kterého později pozveš druhého rodiče, prarodiče
                nebo kohokoli dalšího.
              </p>
            </div>

            <Field label="Název rodiny" required>
              <Input
                placeholder="Novákovi"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
              />
            </Field>

            <Field label="Jak se jmenuješ ty" required>
              <Input
                placeholder="Jan"
                value={myName}
                onChange={(e) => setMyName(e.target.value)}
              />
            </Field>

            <Field
              label="Tvoje strana v kalendáři"
              hint="rozliší barvy dnů"
            >
              <div className="grid grid-cols-2 gap-2">
                {(["a", "b"] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setMySide(side)}
                    className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition-colors ${
                      mySide === side
                        ? "border-brand bg-brand-soft"
                        : "border-line-strong hover:bg-surface-2"
                    }`}
                  >
                    <span
                      className="h-4 w-4 shrink-0 rounded-full"
                      style={{
                        backgroundColor: side === "a" ? "var(--parent-a)" : "var(--parent-b)",
                      }}
                    />
                    <span className="font-medium">Strana {side.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Jméno druhého rodiče" hint="nepovinné, jen pro popisky">
              <Input
                placeholder="Petra"
                value={otherName}
                onChange={(e) => setOtherName(e.target.value)}
              />
            </Field>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <div>
              <h1 className="text-lg font-semibold text-ink">Kdo jsou vaše děti?</h1>
              <p className="mt-1 text-sm text-ink-muted">
                Každé dítě má vlastní barvu — v kalendáři i ve výdajích pak hned poznáš, koho se
                záznam týká.
              </p>
            </div>

            <div className="space-y-4">
              {children.map((child, i) => (
                <div key={i} className="rounded-xl border border-line bg-surface-2 p-3.5">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-3">
                      <Input
                        placeholder="Jméno dítěte"
                        value={child.name}
                        onChange={(e) =>
                          setChildren((prev) =>
                            prev.map((c, j) => (j === i ? { ...c, name: e.target.value } : c)),
                          )
                        }
                      />
                      <Field label="Datum narození" hint="nepovinné">
                        <Input
                          type="date"
                          value={child.birthDate}
                          onChange={(e) =>
                            setChildren((prev) =>
                              prev.map((c, j) =>
                                j === i ? { ...c, birthDate: e.target.value } : c,
                              ),
                            )
                          }
                        />
                      </Field>
                      <Field label="Barva">
                        <ColorPicker
                          value={child.color}
                          palette={COLOR_PALETTE}
                          onChange={(color) =>
                            setChildren((prev) =>
                              prev.map((c, j) => (j === i ? { ...c, color } : c)),
                            )
                          }
                        />
                      </Field>
                    </div>
                    {children.length > 1 ? (
                      <button
                        type="button"
                        aria-label="Odebrat dítě"
                        onClick={() => setChildren((prev) => prev.filter((_, j) => j !== i))}
                        className="rounded-lg p-2 text-ink-subtle hover:bg-surface hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="secondary"
              className="w-full"
              onClick={() =>
                setChildren((prev) => [
                  ...prev,
                  {
                    name: "",
                    birthDate: "",
                    color: COLOR_PALETTE[(prev.length + 2) % COLOR_PALETTE.length],
                  },
                ])
              }
            >
              <Plus className="h-4 w-4" /> Přidat další dítě
            </Button>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div>
              <h1 className="text-lg font-semibold text-ink">Jak se u vás střídáte?</h1>
              <p className="mt-1 text-sm text-ink-muted">
                Podle toho obarvíme kalendář a spočítáme noci. Kdykoli později změníš, i jen pro
                jedno dítě.
              </p>
            </div>

            <div className="space-y-2">
              {(Object.keys(PATTERN_LABELS) as PatternKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`w-full rounded-xl border p-3.5 text-left transition-colors ${
                    kind === k ? "border-brand bg-brand-soft" : "border-line-strong hover:bg-surface-2"
                  }`}
                >
                  <span className="block text-sm font-medium text-ink">{PATTERN_LABELS[k]}</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">{PATTERN_HINTS[k]}</span>
                </button>
              ))}
            </div>

            {kind === "custom_weekly" ? (
              <Field label="Rozpis týdne" hint="klikni na den a přepni stranu">
                <WeeklyMapEditor value={weeklyMap} onChange={setWeeklyMap} />
              </Field>
            ) : (
              <>
                <Field
                  label={kind === "fixed_parent" ? "Platí od" : "Začátek prvního cyklu"}
                  hint={kind === "fixed_parent" ? undefined : "typicky pondělí"}
                >
                  <Input
                    type="date"
                    value={anchorDate}
                    onChange={(e) => setAnchorDate(e.target.value)}
                  />
                </Field>

                <Field
                  label={
                    kind === "fixed_parent"
                      ? "U koho děti jsou"
                      : "Kdo má děti v prvním cyklu"
                  }
                >
                  <Select
                    value={anchorSide}
                    onChange={(e) => setAnchorSide(e.target.value as "a" | "b")}
                  >
                    <option value="a">
                      Strana A{mySide === "a" ? ` — ${myName || "já"}` : otherName ? ` — ${otherName}` : ""}
                    </option>
                    <option value="b">
                      Strana B{mySide === "b" ? ` — ${myName || "já"}` : otherName ? ` — ${otherName}` : ""}
                    </option>
                  </Select>
                </Field>
              </>
            )}
          </>
        ) : null}

        {error ? <Alert tone="danger">{error}</Alert> : null}

        <div className="flex gap-2 pt-1">
          {step > 0 ? (
            <Button variant="secondary" onClick={() => setStep((s) => s - 1)} disabled={busy}>
              <ArrowLeft className="h-4 w-4" /> Zpět
            </Button>
          ) : null}

          {step < STEPS.length - 1 ? (
            <Button
              className="flex-1"
              size="lg"
              disabled={!canContinue}
              onClick={() => setStep((s) => s + 1)}
            >
              Pokračovat <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button className="flex-1" size="lg" disabled={busy} onClick={finish}>
              {busy ? <Spinner /> : <Baby className="h-4 w-4" />}
              {busy ? "Zakládám…" : "Hotovo, jdeme na to"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

const DOW_LABELS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

export function WeeklyMapEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const chars = value.padEnd(7, "a").slice(0, 7).split("");

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {chars.map((c, i) => (
        <button
          key={i}
          type="button"
          onClick={() => {
            const next = [...chars];
            next[i] = c === "a" ? "b" : "a";
            onChange(next.join(""));
          }}
          className="flex flex-col items-center gap-1 rounded-lg border border-line p-2 text-xs font-medium transition-colors"
          style={{
            backgroundColor: c === "a" ? "var(--parent-a)" : "var(--parent-b)",
            color: "#fff",
            borderColor: "transparent",
          }}
        >
          <span>{DOW_LABELS[i]}</span>
          <span className="text-[10px] uppercase opacity-90">{c}</span>
        </button>
      ))}
    </div>
  );
}
