"use client";

import * as React from "react";
import { startOfWeek } from "date-fns";
import { ArrowRight, Check, Copy, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert, Spinner } from "@/components/ui/misc";
import { WeeklyMapEditor } from "@/app/vitejte/wizard";
import { PATTERN_HINTS, PATTERN_LABELS, currentWeekInfo } from "@/lib/custody";
import { WEEK_OPTS, toDateKey } from "@/lib/dates";
import {
  VYCHOZI_VSTUP,
  spocitejPlan,
  zkontrolujVstup,
  type PlanVstup,
} from "@/lib/kalkulacka";
import { cn, hlaskaChyby } from "@/lib/format";
import type { PatternKind } from "@/lib/types";
import { BARVA_A, BARVA_B, Vysledek } from "./vysledek";

const VZORY: PatternKind[] = [
  "iso_week_parity",
  "alternating_weeks",
  "week_2_2_3",
  "custom_weekly",
  "fixed_parent",
];

/** Podle vzoru se mění i to, co vlastně datum znamená. */
const POPIS_DATA: Record<PatternKind, string> = {
  iso_week_parity: "Od kdy rozpis platí",
  alternating_weeks: "První den prvního týdne",
  week_2_2_3: "První den cyklu",
  custom_weekly: "První den prvního týdne rozpisu",
  fixed_parent: "Od kdy to platí",
};

export function Kalkulacka() {
  const [vstup, setVstup] = React.useState<PlanVstup>(VYCHOZI_VSTUP);
  const [email, setEmail] = React.useState("");
  const [souhlas, setSouhlas] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [chyba, setChyba] = React.useState<string | null>(null);
  const [odkaz, setOdkaz] = React.useState<string | null>(null);
  const [poslano, setPoslano] = React.useState(false);
  const [zkopirovano, setZkopirovano] = React.useState(false);

  // Datum se dosazuje až v prohlížeči — jinak by se serverové a klientské
  // vykreslení lišilo o půlnoci.
  React.useEffect(() => {
    setVstup((v) =>
      v.anchorDate ? v : { ...v, anchorDate: toDateKey(startOfWeek(new Date(), WEEK_OPTS)) },
    );
  }, []);

  const uprav = <K extends keyof PlanVstup>(klic: K, hodnota: PlanVstup[K]) =>
    setVstup((v) => ({ ...v, [klic]: hodnota }));

  const vysledek = React.useMemo(
    () => (vstup.anchorDate ? spocitejPlan(vstup) : null),
    [vstup],
  );

  const tyden = React.useMemo(() => currentWeekInfo(), []);

  async function uloz() {
    const potiz = zkontrolujVstup(vstup);
    if (potiz) {
      setChyba(potiz);
      return;
    }

    setBusy(true);
    setChyba(null);

    // Odkud člověk přišel — kvůli měření kanálů, ne kvůli sledování osob.
    const zdroj = new URLSearchParams(window.location.search).get("utm_source");

    const odpoved = await fetch("/api/kalkulacka", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vstup,
        email: email.trim() || null,
        souhlasMarketing: souhlas,
        zdroj,
      }),
    });
    const data = await odpoved.json();

    if (!odpoved.ok) {
      setBusy(false);
      setChyba(data.error);
      return;
    }

    const url = `${window.location.origin}/kalkulacka/${data.token}`;
    setOdkaz(url);

    // Když nechal e-mail, pošleme mu rovnou přihlašovací odkaz — rozpis se
    // mu po přihlášení sám překlopí do aplikace.
    if (email.trim()) {
      const supabase = createClient();
      const cil = `/vitejte?plan=${data.token}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?dal=${encodeURIComponent(cil)}`,
        },
      });
      if (error) setChyba(`Rozpis je uložený, ale e-mail se nepodařilo poslat: ${hlaskaChyby(error)}`);
      else setPoslano(true);
    }

    setBusy(false);
  }

  async function kopiruj() {
    if (!odkaz) return;
    await navigator.clipboard.writeText(odkaz);
    setZkopirovano(true);
    setTimeout(() => setZkopirovano(false), 2000);
  }

  return (
    <div className="space-y-8">
      {/* ── Zadání ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div className="space-y-5">
          <Field label="Jak se u vás střídáte" hint={PATTERN_HINTS[vstup.kind]}>
            <Select
              value={vstup.kind}
              onChange={(e) => uprav("kind", e.target.value as PatternKind)}
            >
              {VZORY.map((k) => (
                <option key={k} value={k}>
                  {PATTERN_LABELS[k]}
                </option>
              ))}
            </Select>
          </Field>

          {vstup.kind === "custom_weekly" ? (
            <Field
              label="Které dny u koho"
              hint="klikáním přepínáš — rozpis může být na týden nebo na dva"
            >
              <WeeklyMapEditor
                value={vstup.weeklyMap}
                onChange={(v) => uprav("weeklyMap", v)}
                labelA={vstup.jmenoA}
                labelB={vstup.jmenoB}
                colorA={BARVA_A}
                colorB={BARVA_B}
              />
            </Field>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={POPIS_DATA[vstup.kind]}>
              <Input
                type="date"
                value={vstup.anchorDate}
                onChange={(e) => uprav("anchorDate", e.target.value)}
              />
            </Field>

            <Field label="Kolik máte dětí">
              <Select
                value={vstup.pocetDeti}
                onChange={(e) => uprav("pocetDeti", Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {vstup.kind !== "custom_weekly" ? (
            <Field
              label={
                vstup.kind === "iso_week_parity"
                  ? "Kdo má sudý týden"
                  : vstup.kind === "fixed_parent"
                    ? "U koho děti jsou"
                    : "Kdo začíná"
              }
              hint={
                vstup.kind === "iso_week_parity"
                  ? `teď probíhá ${tyden.week}. týden, tedy ${tyden.even ? "sudý" : "lichý"}`
                  : undefined
              }
            >
              <div className="grid grid-cols-2 gap-2">
                {(["a", "b"] as const).map((strana) => {
                  const vybrano = vstup.anchorSide === strana;
                  const barva = strana === "a" ? BARVA_A : BARVA_B;
                  return (
                    <button
                      key={strana}
                      type="button"
                      onClick={() => uprav("anchorSide", strana)}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                        vybrano ? "border-transparent text-white" : "border-line-strong text-ink",
                      )}
                      style={vybrano ? { backgroundColor: barva } : undefined}
                    >
                      {strana === "a" ? vstup.jmenoA : vstup.jmenoB}
                    </button>
                  );
                })}
              </div>
            </Field>
          ) : null}

          <details className="rounded-xl bg-surface-2 px-3.5 py-2.5">
            <summary className="cursor-pointer text-sm text-ink-muted">
              Přejmenovat strany
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="První strana">
                <Input
                  value={vstup.jmenoA}
                  maxLength={40}
                  onChange={(e) => uprav("jmenoA", e.target.value)}
                />
              </Field>
              <Field label="Druhá strana">
                <Input
                  value={vstup.jmenoB}
                  maxLength={40}
                  onChange={(e) => uprav("jmenoB", e.target.value)}
                />
              </Field>
            </div>
            <p className="mt-2 text-xs text-ink-subtle">
              Jména dětí schválně nikde nezadáváš — k výpočtu nejsou potřeba.
            </p>
          </details>
        </div>
      </div>

      {/* ── Výsledek ─────────────────────────────────────────── */}
      {vysledek ? <Vysledek vstup={vstup} vysledek={vysledek} /> : null}

      {/* ── Uložení a odeslání ───────────────────────────────── */}
      {vysledek ? (
        <div className="rounded-2xl border border-brand/25 bg-brand-soft/40 p-5 sm:p-6">
          {odkaz ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                <div>
                  <p className="font-semibold text-ink">Rozpis je uložený</p>
                  <p className="text-sm text-ink-muted">
                    {poslano
                      ? "Poslali jsme ti odkaz na e-mail. Klikni v něm a rozpis se ti překlopí do aplikace."
                      : "Odkaz si ulož nebo pošli druhému rodiči."}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Input readOnly value={odkaz} onFocus={(e) => e.currentTarget.select()} />
                <Button variant="secondary" onClick={kopiruj}>
                  {zkopirovano ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {zkopirovano ? "Zkopírováno" : "Kopírovat"}
                </Button>
              </div>

              {chyba ? <Alert tone="warning">{chyba}</Alert> : null}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-ink">
                  Uložit a poslat druhému rodiči
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Dostaneš odkaz, který se dá poslat dál — a rozpis ti zůstane, takže se k
                  němu vrátíš, až se něco změní.
                </p>
              </div>

              {chyba ? <Alert tone="danger">{chyba}</Alert> : null}

              <Field
                label="E-mail"
                hint="nepovinný — bez něj dostaneš jen odkaz"
              >
                <Input
                  type="email"
                  placeholder="jmeno@example.cz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              {email.trim() ? (
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={souhlas}
                    onChange={(e) => setSouhlas(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-line-strong accent-[var(--brand)]"
                  />
                  <span className="text-sm text-ink-muted">
                    Chci občas dostat tip, jak si střídavou péči zjednodušit. Odhlásit se dá
                    jedním klikem.
                  </span>
                </label>
              ) : null}

              <Button size="lg" onClick={uloz} disabled={busy}>
                {busy ? <Spinner /> : <Send className="h-4 w-4" />}
                {email.trim() ? "Uložit a poslat na e-mail" : "Uložit a získat odkaz"}
              </Button>

              <p className="text-xs text-ink-subtle">
                Výpočet proběhl u tebe v prohlížeči. Na server se něco pošle až teď, když
                klikneš.
              </p>
            </div>
          )}
        </div>
      ) : null}

      {odkaz ? (
        <a
          href="/registrace"
          className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5 transition-colors hover:bg-surface-2"
        >
          <span>
            <span className="block font-semibold text-ink">
              Chceš k rozpisu i kroužky, výdaje a připomínky?
            </span>
            <span className="block text-sm text-ink-muted">
              Celá aplikace pro dvě domácnosti — druhý rodič má přístup zdarma.
            </span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-brand" />
        </a>
      ) : null}
    </div>
  );
}
