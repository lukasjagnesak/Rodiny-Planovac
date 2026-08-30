"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Baby, Check, Copy, Mail, Plus, Send, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert, ColorPicker, Spinner } from "@/components/ui/misc";
import { COLOR_PALETTE } from "@/lib/constants";
import { PATTERN_HINTS, PATTERN_LABELS, currentWeekInfo } from "@/lib/custody";
import { ACTIVE_FAMILY_COOKIE } from "@/lib/members";
import { hlaskaChyby } from "@/lib/format";
import { toDateKey } from "@/lib/dates";
import { startOfWeek } from "date-fns";
import { WEEK_OPTS } from "@/lib/dates";
import type { PatternKind } from "@/lib/types";
import { zmer } from "@/lib/mereni";

interface ChildDraft {
  name: string;
  birthDate: string;
  color: string;
}

/**
 * Poslední krok je pozvánka schválně až za kalendářem.
 *
 * Nejcennější akce v celém onboardingu je připojení druhého rodiče —
 * dokud je v aplikaci jeden rodič, je to zápisník; jakmile jsou tam dva,
 * je to dohoda. Zároveň ale nesmí stát v cestě k první hodnotě: rodič se
 * nejdřív musí podívat na hotový kalendář, teprve pak má co posílat dál.
 */
const STEPS = ["Rodina", "Děti", "Střídání", "Druhý rodič"];
const POSLEDNI_NASTAVENI = 2;

/** Zadání přenesené z veřejné kalkulačky. */
export interface PredvyplnenoZKalkulacky {
  kind: PatternKind;
  anchorDate: string;
  anchorSide: "a" | "b";
  weeklyMap: string;
  pocetDeti: number;
}

export function OnboardingWizard({
  defaultName,
  predvyplneno,
}: {
  defaultName: string;
  /** Když člověk přišel z kalkulačky, střídání už má vyplněné. */
  predvyplneno?: PredvyplnenoZKalkulacky | null;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [zalozenaRodina, setZalozenaRodina] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [familyName, setFamilyName] = React.useState("");
  const [myName, setMyName] = React.useState(defaultName);
  const [mySide, setMySide] = React.useState<"a" | "b">("a");
  const [otherName, setOtherName] = React.useState("");

  const [children, setChildren] = React.useState<ChildDraft[]>(() =>
    Array.from({ length: Math.max(predvyplneno?.pocetDeti ?? 1, 1) }, (_, i) => ({
      name: "",
      birthDate: "",
      color: COLOR_PALETTE[(2 + i) % COLOR_PALETTE.length],
    })),
  );

  const [kind, setKind] = React.useState<PatternKind>(
    predvyplneno?.kind ?? "iso_week_parity",
  );
  const [anchorDate, setAnchorDate] = React.useState(
    predvyplneno?.anchorDate ?? toDateKey(startOfWeek(new Date(), WEEK_OPTS)),
  );
  const [anchorSide, setAnchorSide] = React.useState<"a" | "b">(
    predvyplneno?.anchorSide ?? "a",
  );
  const [weeklyMap, setWeeklyMap] = React.useState(predvyplneno?.weeklyMap ?? "aabbaab");

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

      zmer("rodina");

      document.cookie = `${ACTIVE_FAMILY_COOKIE}=${familyId}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      setZalozenaRodina(familyId as string);
      setBusy(false);
      setStep(3);
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

            {kind === "iso_week_parity" ? (
              <>
                <Field
                  label="Sudý týden mají děti u"
                  hint="lichý týden pak u druhého rodiče"
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
                <p className="rounded-xl bg-surface-2 p-3 text-sm text-ink-muted">
                  Tento týden je{" "}
                  <strong className="text-ink">{currentWeekInfo().week}.</strong> — tedy{" "}
                  <strong className="text-ink">
                    {currentWeekInfo().even ? "sudý" : "lichý"}
                  </strong>
                  .
                </p>
              </>
            ) : kind === "custom_weekly" ? (
              <>
                <Field label="Rozpis dnů" hint="klikni na den a přepni stranu">
                  <WeeklyMapEditor value={weeklyMap} onChange={setWeeklyMap} />
                </Field>
                {weeklyMap.length === 14 ? (
                  <Field
                    label="Prvním týdnem cyklu je týden, do kterého padá"
                    hint="stačí libovolný den z toho týdne"
                  >
                    <Input
                      type="date"
                      value={anchorDate}
                      onChange={(e) => setAnchorDate(e.target.value)}
                    />
                  </Field>
                ) : null}
              </>
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

        {step === 3 && zalozenaRodina ? (
          <PozvaniDruhehoRodice
            familyId={zalozenaRodina}
            jmeno={otherName}
            strana={mySide === "a" ? "b" : "a"}
          />
        ) : null}

        {error ? <Alert tone="danger">{error}</Alert> : null}

        <div className={`flex gap-2 pt-1 ${step > POSLEDNI_NASTAVENI ? "hidden" : ""}`}>
          {step > 0 ? (
            <Button variant="secondary" onClick={() => setStep((s) => s - 1)} disabled={busy}>
              <ArrowLeft className="h-4 w-4" /> Zpět
            </Button>
          ) : null}

          {step < POSLEDNI_NASTAVENI ? (
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

/**
 * Rozpis dnů. Sedm políček = opakuje se každý týden, čtrnáct = dvoutýdenní
 * cyklus. Den patří tomu, u koho dítě tu noc spí — předání odpoledne se tedy
 * zapisuje na den, kdy dítě u nového rodiče přespí.
 */
export function WeeklyMapEditor({
  value,
  onChange,
  labelA = "Strana A",
  labelB = "Strana B",
  colorA = "var(--parent-a)",
  colorB = "var(--parent-b)",
}: {
  value: string;
  onChange: (value: string) => void;
  labelA?: string;
  labelB?: string;
  colorA?: string;
  colorB?: string;
}) {
  const twoWeeks = value.length === 14;
  const chars = value.padEnd(twoWeeks ? 14 : 7, "a").slice(0, twoWeeks ? 14 : 7).split("");

  function toggle(i: number) {
    const next = [...chars];
    next[i] = next[i] === "a" ? "b" : "a";
    onChange(next.join(""));
  }

  function setLength(two: boolean) {
    if (two === twoWeeks) return;
    // Při rozšíření se druhý týden založí jako kopie prvního, ať je co upravovat.
    onChange(two ? chars.join("") + chars.join("") : chars.slice(0, 7).join(""));
  }

  function row(offset: number) {
    return (
      <div className="grid grid-cols-7 gap-1.5">
        {DOW_LABELS.map((label, i) => {
          const idx = offset + i;
          const isA = chars[idx] === "a";
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggle(idx)}
              aria-label={`${label} — ${isA ? labelA : labelB}`}
              className="flex flex-col items-center gap-0.5 rounded-lg border border-transparent py-2 text-xs font-medium text-white transition-transform active:scale-95"
              style={{ backgroundColor: isA ? colorA : colorB }}
            >
              <span>{label}</span>
              <span className="text-[10px] opacity-90">{isA ? "A" : "B"}</span>
            </button>
          );
        })}
      </div>
    );
  }

  const nightsA = chars.filter((c) => c === "a").length;

  return (
    <div className="space-y-2.5">
      <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
        <button
          type="button"
          onClick={() => setLength(false)}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
            !twoWeeks ? "bg-surface text-ink shadow-sm" : "text-ink-muted"
          }`}
        >
          Každý týden stejně
        </button>
        <button
          type="button"
          onClick={() => setLength(true)}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
            twoWeeks ? "bg-surface text-ink shadow-sm" : "text-ink-muted"
          }`}
        >
          Dvoutýdenní cyklus
        </button>
      </div>

      {twoWeeks ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
            První týden
          </p>
          {row(0)}
          <p className="pt-1 text-xs font-medium uppercase tracking-wide text-ink-subtle">
            Druhý týden
          </p>
          {row(7)}
        </div>
      ) : (
        row(0)
      )}

      <p className="text-xs text-ink-subtle">
        {nightsA} z {chars.length}{" "}
        {chars.length === 7 ? "nocí v týdnu" : "nocí za dva týdny"} připadá na stranu A.
        Den patří tomu, u koho dítě tu noc spí.
      </p>
    </div>
  );
}


/**
 * Poslední obrazovka onboardingu: pozvat druhého rodiče.
 *
 * Přeskočit jde jedním kliknutím — kdo zrovna teď nemá druhého rodiče
 * kam pozvat (a v rozvodu to není nic výjimečného), nesmí tady uváznout.
 * Připomene se to na přehledu.
 */
function PozvaniDruhehoRodice({
  familyId,
  jmeno,
  strana,
}: {
  familyId: string;
  jmeno: string;
  strana: "a" | "b";
}) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [odkaz, setOdkaz] = React.useState<string | null>(null);
  const [emailem, setEmailem] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [chyba, setChyba] = React.useState<string | null>(null);
  const [zkopirovano, setZkopirovano] = React.useState(false);

  async function pozvat() {
    if (!email.includes("@")) {
      setChyba("Zadej platný e-mail.");
      return;
    }
    setBusy(true);
    setChyba(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("family_invites")
      .insert({
        family_id: familyId,
        email: email.trim().toLowerCase(),
        role: "parent",
        custody_side: strana,
      })
      .select("token")
      .single();

    if (error) {
      setBusy(false);
      setChyba(hlaskaChyby(error));
      return;
    }

    // Odeslání e-mailem je bonus: když SMTP mlčí, odkaz se pořád dá poslat
    // ručně, takže se kvůli tomu pozvánka neruší.
    const { poslano } = await odesliPozvanku(data.token);

    setBusy(false);
    setEmailem(poslano);
    setOdkaz(`${window.location.origin}/pozvanka/${data.token}`);
  }

  function dal() {
    router.push("/prehled");
    router.refresh();
  }

  return (
    <>
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success">
          <Check className="h-6 w-6" />
        </div>
        <h1 className="mt-3 text-center text-lg font-semibold text-ink">
          Kalendář je hotový
        </h1>
        <p className="mt-1 text-center text-sm text-ink-muted">
          Zbývá jediná věc, kvůli které to celé má smysl: aby to samé viděl
          i {jmeno.trim() || "druhý rodič"}. Pak už se nikdo nemusí ptát, kdo má které
          úterý.
        </p>
      </div>

      {odkaz ? (
        <div className="space-y-3">
          <Alert tone="success">
            {emailem
              ? `Pozvánku jsme poslali na ${email.trim().toLowerCase()}. Pro jistotu můžeš odkaz poslat i sám — platí 30 dní.`
              : "Pozvánka je připravená. Pošli tenhle odkaz — platí 30 dní."}
          </Alert>
          <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
            <p className="min-w-0 flex-1 truncate text-sm text-ink-muted">{odkaz}</p>
            <button
              type="button"
              aria-label="Zkopírovat odkaz"
              onClick={async () => {
                await navigator.clipboard.writeText(odkaz);
                setZkopirovano(true);
                setTimeout(() => setZkopirovano(false), 2000);
              }}
              className="shrink-0 rounded-lg p-2 text-ink-subtle hover:bg-surface hover:text-ink"
            >
              {zkopirovano ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
          <Button size="lg" className="w-full" onClick={dal}>
            Přejít do aplikace <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label={`E-mail druhého rodiče${jmeno.trim() ? ` (${jmeno.trim()})` : ""}`}>
            <Input
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="druhy.rodic@example.cz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          {chyba ? <Alert tone="danger">{chyba}</Alert> : null}

          <Button size="lg" className="w-full" onClick={pozvat} disabled={busy}>
            {busy ? <Spinner /> : <Send className="h-4 w-4" />}
            {busy ? "Připravuji…" : "Vytvořit pozvánku"}
          </Button>

          <button
            type="button"
            onClick={dal}
            className="w-full text-center text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Teď ne, pozvu ho později
          </button>

          <p className="flex items-start gap-2 text-xs text-ink-subtle">
            <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Druhý rodič uvidí kalendář a výdaje, ale nic tím neplatí — předplatné je
            jedno na celou rodinu.
          </p>
        </div>
      )}
    </>
  );
}


/**
 * Pošle pozvánku e-mailem. Selhání se mlčky spolkne — odkaz zůstává
 * a poslat ho ručně je pořád lepší než hláška o tom, co se nepovedlo.
 */
async function odesliPozvanku(token: string): Promise<{ poslano: boolean }> {
  try {
    const odpoved = await fetch("/api/pozvanka/odeslat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = (await odpoved.json()) as { poslano?: boolean };
    return { poslano: Boolean(data.poslano) };
  } catch {
    return { poslano: false };
  }
}
