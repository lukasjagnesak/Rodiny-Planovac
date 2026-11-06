"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { HandCoins } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Alert, Spinner } from "@/components/ui/misc";
import { formatDayShort } from "@/lib/dates";
import { formatMoney, hlaskaChyby } from "@/lib/format";
import {
  STAV_PROPLACENI,
  akceProplaceni,
  podilKProplaceni,
  posledniZadost,
} from "@/lib/proplaceni";
import { maDvaRodice } from "@/lib/zadosti";
import { formatUcet, normalizujUcet } from "@/lib/ucet";
import { QrPlatba } from "./qr-platba";
import type { Expense, SessionContext, ZadostProplaceni } from "@/lib/types";

/**
 * Žádost o proplacení výdaje: požádat, schválit nebo rozporovat,
 * potvrdit příjem. Pravidla hlídá databáze (migrace 0036), všechno se
 * zapisuje do Zpráv. Peníze aplikace nepřevádí.
 */

function kontext(session: SessionContext) {
  const role = session.myMembership.role;
  return {
    ja: session.userId,
    jeRodic: role === "owner" || role === "parent",
    dvaRodice: maDvaRodice(session.members),
  };
}

/** Notifikace navíc; když selže, žádost i zpráva v databázi zůstanou. */
function oznam(zadostId: string) {
  void fetch("/api/proplaceni/oznam", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ zadostId }),
  }).catch(() => undefined);
}

/** Stav žádosti jako štítek do seznamu výdajů. */
export function StitekProplaceni({ expense }: { expense: Expense }) {
  const z = posledniZadost(expense.zadosti_proplaceni);
  if (!z || z.stav === "zaplaceno") return null;
  const stav = STAV_PROPLACENI[z.stav];
  return <Badge color={stav.barva}>{stav.nazev}</Badge>;
}

/** Karta nahoře ve Výdajích: co čeká na mě a co jsem poslal(a) já. */
export function ProplaceniPrehled({
  session,
  expenses,
}: {
  session: SessionContext;
  expenses: Expense[];
}) {
  const k = kontext(session);
  const polozky = expenses
    .map((e) => ({ e, z: posledniZadost(e.zadosti_proplaceni) }))
    .filter(
      (p): p is { e: Expense; z: ZadostProplaceni } =>
        p.z !== null && (p.z.stav === "ceka" || p.z.stav === "schvaleno" || p.z.stav === "rozporovano"),
    )
    .sort((a, b) => (a.z.created_at < b.z.created_at ? 1 : -1));

  if (polozky.length === 0) return null;

  const naMe = polozky.filter((p) => p.z.stav === "ceka" && p.z.pozadal !== k.ja).length;

  return (
    <Card>
      <CardHeader
        title="Proplacení"
        description={
          naMe > 0
            ? `${naMe} ${naMe === 1 ? "žádost čeká" : naMe < 5 ? "žádosti čekají" : "žádostí čeká"} na vaši odpověď`
            : "Rozběhnuté žádosti o proplacení"
        }
      />
      <ul className="divide-y divide-line">
        {polozky.map(({ e, z }) => (
          <li key={z.id} className="px-4 py-3 sm:px-5">
            <ZadostRadek session={session} expense={e} zadost={z} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Oddíl ve formuláři výdaje. */
export function ProplaceniVydaje({
  session,
  expense,
}: {
  session: SessionContext;
  expense: Expense;
}) {
  const z = posledniZadost(expense.zadosti_proplaceni);
  const k = kontext(session);
  const akce = akceProplaceni({ vydaj: expense, zadost: z, ...k });
  if (!z && akce.length === 0) return null;

  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink">
        <HandCoins className="h-4 w-4 text-ink-subtle" /> Proplacení
      </p>
      {z ? (
        <ZadostRadek session={session} expense={expense} zadost={z} bezNazvu />
      ) : (
        <Pozadat session={session} expense={expense} />
      )}
    </div>
  );
}

function Pozadat({ session, expense }: { session: SessionContext; expense: Expense }) {
  const router = useRouter();
  const [poznamka, setPoznamka] = React.useState("");
  const ulozeny = session.profile.ucet ?? null;
  const [ucet, setUcet] = React.useState(ulozeny ? formatUcet(ulozeny) : "");
  const [ulozit, setUlozit] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const podil = podilKProplaceni(expense.amount, expense.split_percent);

  async function pozadat() {
    setError(null);
    let iban: string | null = null;
    if (ucet.trim()) {
      const vysledek = normalizujUcet(ucet);
      if ("chyba" in vysledek) {
        setError(vysledek.chyba);
        return;
      }
      iban = vysledek.iban;
    }
    setBusy(true);
    const supabase = createClient();
    // Nový účet si rodič uloží do profilu, ať ho příště nepíše znovu.
    if (iban && iban !== ulozeny && ulozit) {
      await supabase.from("profiles").update({ ucet: iban }).eq("id", session.userId);
    }
    const { data, error } = await supabase.rpc("pozadej_o_proplaceni", {
      vydaj: expense.id,
      poznamka: poznamka.trim() || null,
      ucet: iban,
    });
    setBusy(false);
    if (error) {
      setError(hlaskaChyby(error));
      return;
    }
    if (typeof data === "string") oznam(data);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-ink-muted">
        Druhý rodič dostane žádost o{" "}
        <span className="tnum font-medium text-ink">
          {formatMoney(podil, session.family.currency)}
        </span>{" "}
        ({Number(expense.split_percent)} %) a může ji schválit, nebo rozporovat. Zapíše se do
        Zpráv.
      </p>
      <Field label="Na účet" hint="Druhý rodič dostane QR kód k zaplacení. Bez účtu jde žádat taky.">
        <Input
          autoComplete="off"
          placeholder="123456789/0800"
          value={ucet}
          onChange={(e) => setUcet(e.target.value)}
        />
      </Field>
      {ucet.trim() && ucet.trim() !== (ulozeny ? formatUcet(ulozeny) : "") ? (
        <Checkbox
          label="Uložit účet do profilu"
          checked={ulozit}
          onChange={(e) => setUlozit(e.target.checked)}
        />
      ) : null}
      <Textarea
        rows={2}
        placeholder="Poznámka (nepovinné)"
        value={poznamka}
        onChange={(e) => setPoznamka(e.target.value)}
      />
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button size="sm" onClick={pozadat} disabled={busy}>
        {busy ? <Spinner /> : "Požádat o proplacení"}
      </Button>
    </div>
  );
}

function ZadostRadek({
  session,
  expense,
  zadost,
  bezNazvu = false,
}: {
  session: SessionContext;
  expense: Expense;
  zadost: ZadostProplaceni;
  bezNazvu?: boolean;
}) {
  const router = useRouter();
  const k = kontext(session);
  const akce = akceProplaceni({ vydaj: expense, zadost, ...k });
  const [rozporuji, setRozporuji] = React.useState(false);
  const [duvod, setDuvod] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const stav = STAV_PROPLACENI[zadost.stav];
  const castka = formatMoney(Number(zadost.castka), session.family.currency);
  const moje = zadost.pozadal === k.ja;

  async function zavolej(fn: string, args: Record<string, unknown>, oznamit = true) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc(fn, args);
    setBusy(false);
    if (error) {
      setError(hlaskaChyby(error));
      return;
    }
    if (oznamit) oznam(zadost.id);
    setRozporuji(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {!bezNazvu ? (
            <p className="truncate font-medium text-ink">
              {expense.title}{" "}
              <span className="text-sm font-normal text-ink-muted">
                · {formatDayShort(expense.spent_on)}
              </span>
            </p>
          ) : null}
          <p className="text-sm text-ink-muted">
            {moje ? "Žádáte" : `Žádá ${zadost.pozadal_jmeno}`} o{" "}
            <span className="tnum font-medium text-ink">{castka}</span>
          </p>
          {zadost.poznamka ? (
            <p className="mt-0.5 text-sm text-ink-muted">„{zadost.poznamka}“</p>
          ) : null}
        </div>
        <Badge color={stav.barva}>{stav.nazev}</Badge>
      </div>

      {zadost.stav === "rozporovano" && zadost.duvod ? (
        <Alert tone="warning">
          {zadost.odpovedel_jmeno ?? "Druhý rodič"} rozporuje: {zadost.duvod}
        </Alert>
      ) : null}
      {zadost.ucet && moje && (zadost.stav === "ceka" || zadost.stav === "schvaleno") ? (
        <p className="text-xs text-ink-subtle">Na účet {formatUcet(zadost.ucet)}</p>
      ) : null}
      {/* QR dostane ten, kdo platí, až když žádost schválil — platit
          rozporovanou nebo čekající částku nemá smysl. */}
      {zadost.ucet && !moje && zadost.stav === "schvaleno" ? (
        <QrPlatba
          iban={zadost.ucet}
          castka={Number(zadost.castka)}
          mena={expense.currency || session.family.currency}
          zprava={`Klidoo: ${expense.title} ${formatDayShort(expense.spent_on)}`}
        />
      ) : null}
      {zadost.stav === "schvaleno" ? (
        <p className="text-xs text-ink-subtle">
          {moje
            ? "Až peníze přijdou, potvrďte příjem. Tím se výdaj vypořádá."
            : `Schváleno. Po zaplacení příjem potvrdí ${zadost.pozadal_jmeno}.`}
        </p>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {rozporuji ? (
        <div className="space-y-2">
          <Field label="S čím nesouhlasíte" required>
            <Textarea
              rows={2}
              placeholder="Např. jiná částka, než jsme se domluvili"
              value={duvod}
              onChange={(e) => setDuvod(e.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setRozporuji(false)} disabled={busy}>
              Zpět
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={busy || !duvod.trim()}
              onClick={() =>
                zavolej("odpovez_na_proplaceni", { zadost: zadost.id, schvalit: false, duvod })
              }
            >
              {busy ? <Spinner /> : "Rozporovat"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {akce.includes("odpovedet") ? (
            <>
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  zavolej("odpovez_na_proplaceni", { zadost: zadost.id, schvalit: true })
                }
              >
                {busy ? <Spinner /> : "Schválit"}
              </Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => setRozporuji(true)}>
                Rozporovat
              </Button>
            </>
          ) : null}
          {akce.includes("potvrdit") ? (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => zavolej("potvrd_proplaceni", { zadost: zadost.id })}
            >
              {busy ? <Spinner /> : "Peníze přišly"}
            </Button>
          ) : null}
          {akce.includes("zrusit") ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => zavolej("zrus_proplaceni", { zadost: zadost.id }, false)}
            >
              Zrušit žádost
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
