"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Sheet, ConfirmSheet } from "@/components/ui/sheet";
import { Alert, EmptyState, Segmented, Spinner } from "@/components/ui/misc";
import { Ikona, IkonaDlazdice } from "@/components/ui/ikona";
import { BARVY_IKON } from "@/lib/barvy";
import { formatDay, toDateKey } from "@/lib/dates";
import { formatMoney, hlaskaChyby } from "@/lib/format";
import {
  PRILEZITOSTI,
  akceDarku,
  budeLet,
  dniDoNarozenin,
  popisStavu,
  stavDarku,
} from "@/lib/darky";
import type { Darek, Prilezitost, SessionContext } from "@/lib/types";

/**
 * Nápady na dárky pro děti. Kdo dárek koupí, si ho zamluví — druhý
 * rodič hned vidí, že ho kupovat nemá. Pravidla drží databáze
 * (migrace 0038).
 */
export function DarkyScreen({ session, darky }: { session: SessionContext; darky: Darek[] }) {
  const [dite, setDite] = React.useState<string>("all");
  const [formular, setFormular] = React.useState<{ darek: Darek | null } | null>(null);
  const [kupuji, setKupuji] = React.useState<Darek | null>(null);
  const [mazu, setMazu] = React.useState<Darek | null>(null);
  const [archiv, setArchiv] = React.useState(false);
  const muzeUpravovat = session.myMembership.role !== "viewer";
  const dnes = toDateKey(new Date());

  const vybrane = darky.filter((d) =>
    dite === "all" ? true : dite === "shared" ? d.child_id === null : d.child_id === dite,
  );
  const napady = vybrane.filter((d) => stavDarku(d) === "volny");
  const kupuje = vybrane.filter((d) => ["zamluveny", "koupeny"].includes(stavDarku(d)));
  const darovane = vybrane.filter((d) => d.darovano);

  // Narozeniny do 60 dnů — připomenutí, že je čas vybírat.
  const narozeniny = session.children
    .filter((c) => c.birth_date && (dite === "all" || dite === c.id))
    .map((c) => ({ c, dni: dniDoNarozenin(c.birth_date!, dnes), let: budeLet(c.birth_date!, dnes) }))
    .filter((n) => n.dni <= 60)
    .sort((a, b) => a.dni - b.dni);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Dárky</h1>
        <p className="text-sm text-ink-muted">Nápady pro děti a kdo co koupí</p>
      </div>

      {session.children.length > 1 ? (
        <Segmented
          value={dite}
          onChange={setDite}
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

      {narozeniny.map(({ c, dni, let: roky }) => (
        <Alert key={c.id} tone="info">
          Narozeniny: {c.name} ({roky} {roky === 1 ? "rok" : roky >= 2 && roky <= 4 ? "roky" : "let"}){" "}
          {dni === 0 ? "dnes" : dni === 1 ? "zítra" : `za ${dni} dní`}.
        </Alert>
      ))}

      {vybrane.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Ikona nazev="darek" size={24} />}
            title="Zatím žádné nápady"
            description="Zapisujte, co by děti potěšilo. Kdo dárek koupí, si ho zamluví — a nic se nekoupí dvakrát."
            action={
              muzeUpravovat ? (
                <Button onClick={() => setFormular({ darek: null })}>
                  <Plus className="h-4 w-4" /> Přidat nápad
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <>
          <Oddil nazev="Nápady" pocet={napady.length}>
            {napady.map((d) => (
              <Polozka
                key={d.id}
                d={d}
                session={session}
                muzeUpravovat={muzeUpravovat}
                onUpravit={() => setFormular({ darek: d })}
                onKoupeno={() => setKupuji(d)}
                onSmazat={() => setMazu(d)}
              />
            ))}
          </Oddil>

          <Oddil nazev="Kdo co koupí" pocet={kupuje.length}>
            {kupuje.map((d) => (
              <Polozka
                key={d.id}
                d={d}
                session={session}
                muzeUpravovat={muzeUpravovat}
                onUpravit={() => setFormular({ darek: d })}
                onKoupeno={() => setKupuji(d)}
                onSmazat={() => setMazu(d)}
              />
            ))}
          </Oddil>

          {darovane.length > 0 ? (
            <div>
              <button
                type="button"
                onClick={() => setArchiv((v) => !v)}
                className="text-sm text-brand hover:underline"
              >
                {archiv ? "Skrýt darované" : `Darované (${darovane.length})`}
              </button>
              {archiv ? (
                <div className="mt-2">
                  <Oddil nazev="Darované" pocet={darovane.length}>
                    {darovane.map((d) => (
                      <Polozka
                        key={d.id}
                        d={d}
                        session={session}
                        muzeUpravovat={muzeUpravovat}
                        onUpravit={() => setFormular({ darek: d })}
                        onKoupeno={() => setKupuji(d)}
                        onSmazat={() => setMazu(d)}
                      />
                    ))}
                  </Oddil>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      {muzeUpravovat ? (
        <button
          type="button"
          onClick={() => setFormular({ darek: null })}
          aria-label="Přidat nápad na dárek"
          className="nad-listou fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-ink shadow-[var(--shadow-pop)] transition-transform active:scale-95 lg:right-6"
        >
          <Plus className="h-6 w-6" />
        </button>
      ) : null}

      {formular ? (
        <DarekFormular
          session={session}
          darek={formular.darek}
          vychoziDite={dite !== "all" && dite !== "shared" ? dite : ""}
          onClose={() => setFormular(null)}
        />
      ) : null}
      {kupuji ? <Koupeno session={session} darek={kupuji} onClose={() => setKupuji(null)} /> : null}
      {mazu ? <Smazat darek={mazu} onClose={() => setMazu(null)} /> : null}
    </div>
  );
}

function Oddil({
  nazev,
  pocet,
  children,
}: {
  nazev: string;
  pocet: number;
  children: React.ReactNode;
}) {
  if (pocet === 0) return null;
  return (
    <section>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {nazev} · {pocet}
      </p>
      <Card>
        <ul className="divide-y divide-line">{children}</ul>
      </Card>
    </section>
  );
}

function Polozka({
  d,
  session,
  muzeUpravovat,
  onUpravit,
  onKoupeno,
  onSmazat,
}: {
  d: Darek;
  session: SessionContext;
  muzeUpravovat: boolean;
  onUpravit: () => void;
  onKoupeno: () => void;
  onSmazat: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const dite = session.children.find((c) => c.id === d.child_id);
  const stav = stavDarku(d);
  const akce = akceDarku(d, session.userId, muzeUpravovat);
  const barva =
    stav === "volny"
      ? BARVY_IKON.jantar
      : stav === "zamluveny"
        ? BARVY_IKON.znacka
        : stav === "koupeny"
          ? BARVY_IKON.zelena
          : BARVY_IKON.seda;

  async function zmen(zmena: Partial<Darek>) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("darky").update(zmena).eq("id", d.id);
    setBusy(false);
    if (error) {
      setError(hlaskaChyby(error));
      return;
    }
    router.refresh();
  }

  return (
    <li className="flex gap-3 p-3.5">
      <IkonaDlazdice nazev="darek" barva={barva} size={40} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium text-ink">{d.nazev}</span>
              {dite ? <Badge color={dite.color}>{dite.name}</Badge> : null}
              {d.prilezitost ? <Badge>{PRILEZITOSTI[d.prilezitost]}</Badge> : null}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {d.cena !== null ? (
                <span className="tnum">{formatMoney(Number(d.cena), session.family.currency)} · </span>
              ) : null}
              nápad: {d.pridal === session.userId ? "vy" : d.pridal_jmeno || "člen rodiny"}
              {d.odkaz ? (
                <>
                  {" · "}
                  <a
                    href={d.odkaz}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-0.5 text-brand hover:underline"
                  >
                    odkaz <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              ) : null}
            </p>
          </div>
          <Badge color={barva}>{popisStavu(d, session.userId)}</Badge>
        </div>

        {d.poznamka ? <p className="text-sm text-ink-muted">{d.poznamka}</p> : null}
        {stav === "koupeny" && d.koupeno_at ? (
          <p className="text-xs text-ink-subtle">
            Koupeno {formatDay(d.koupeno_at.slice(0, 10))}
            {d.expense_id ? " · ve výdajích" : ""}
          </p>
        ) : null}
        {error ? <Alert tone="danger">{error}</Alert> : null}

        {akce.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {akce.includes("zamluvit") ? (
              <Button size="sm" disabled={busy} onClick={() => zmen({ koupi: session.userId })}>
                {busy ? <Spinner /> : "Koupím já"}
              </Button>
            ) : null}
            {akce.includes("koupeno") ? (
              <Button size="sm" disabled={busy} onClick={onKoupeno}>
                Koupeno
              </Button>
            ) : null}
            {akce.includes("darovano") ? (
              <Button size="sm" disabled={busy} onClick={() => zmen({ darovano: true })}>
                {busy ? <Spinner /> : "Darováno"}
              </Button>
            ) : null}
            {akce.includes("uvolnit") ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => zmen({ koupi: null })}
                title={d.expense_id ? "Výdaj ve Výdajích zůstane" : undefined}
              >
                Nekoupím
              </Button>
            ) : null}
            <span className="ml-auto flex gap-1">
              {akce.includes("upravit") ? (
                <button
                  type="button"
                  aria-label={`Upravit ${d.nazev}`}
                  onClick={onUpravit}
                  className="rounded-lg p-2 text-ink-subtle hover:bg-surface-2 hover:text-ink"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              ) : null}
              {akce.includes("smazat") ? (
                <button
                  type="button"
                  aria-label={`Smazat ${d.nazev}`}
                  onClick={onSmazat}
                  className="rounded-lg p-2 text-ink-subtle hover:bg-surface-2 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </span>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function DarekFormular({
  session,
  darek,
  vychoziDite,
  onClose,
}: {
  session: SessionContext;
  darek: Darek | null;
  vychoziDite: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [dite, setDite] = React.useState(darek ? (darek.child_id ?? "") : vychoziDite);
  const [nazev, setNazev] = React.useState(darek?.nazev ?? "");
  const [odkaz, setOdkaz] = React.useState(darek?.odkaz ?? "");
  const [cena, setCena] = React.useState(darek?.cena != null ? String(darek.cena) : "");
  const [prilezitost, setPrilezitost] = React.useState<Prilezitost | "">(darek?.prilezitost ?? "");
  const [poznamka, setPoznamka] = React.useState(darek?.poznamka ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function ulozit() {
    if (!nazev.trim()) {
      setError("Napište, co by to mělo být.");
      return;
    }
    const url = odkaz.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      setError("Odkaz musí začínat https:// (zkopírujte ho z prohlížeče).");
      return;
    }
    const castka = cena.trim() ? Number(cena.replace(/\s/g, "").replace(",", ".")) : null;
    if (castka !== null && (!Number.isFinite(castka) || castka < 0)) {
      setError("Cenu napište jako číslo.");
      return;
    }
    setBusy(true);
    setError(null);
    const zaznam = {
      child_id: dite || null,
      nazev: nazev.trim(),
      odkaz: url || null,
      cena: castka,
      prilezitost: prilezitost || null,
      poznamka: poznamka.trim() || null,
    };
    const supabase = createClient();
    const { error } = darek
      ? await supabase.from("darky").update(zaznam).eq("id", darek.id)
      : await supabase.from("darky").insert({ ...zaznam, family_id: session.family.id });
    setBusy(false);
    if (error) {
      setError(hlaskaChyby(error));
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={darek ? "Upravit nápad" : "Nápad na dárek"}
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={busy}>
            Zrušit
          </Button>
          <Button className="flex-1" onClick={ulozit} disabled={busy}>
            {busy ? <Spinner /> : "Uložit"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Field label="Co" required>
          <Input
            placeholder="Lego Friends, kolo, knížka…"
            value={nazev}
            onChange={(e) => setNazev(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pro koho">
            <Select value={dite} onChange={(e) => setDite(e.target.value)}>
              <option value="">Pro všechny děti</option>
              {session.children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Příležitost">
            <Select
              value={prilezitost}
              onChange={(e) => setPrilezitost(e.target.value as Prilezitost | "")}
            >
              <option value="">Neurčeno</option>
              {(Object.keys(PRILEZITOSTI) as Prilezitost[]).map((p) => (
                <option key={p} value={p}>
                  {PRILEZITOSTI[p]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cena" hint="přibližně">
            <Input inputMode="decimal" placeholder="0" value={cena} onChange={(e) => setCena(e.target.value)} />
          </Field>
          <Field label="Odkaz" hint="nepovinné">
            <Input
              type="url"
              placeholder="https://…"
              value={odkaz}
              onChange={(e) => setOdkaz(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Poznámka" hint="velikost, barva, kde se dá koupit">
          <Textarea rows={2} value={poznamka} onChange={(e) => setPoznamka(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  );
}

/** Označení koupeno — volitelně rovnou s výdajem, ať se nezapisuje dvakrát. */
function Koupeno({
  session,
  darek,
  onClose,
}: {
  session: SessionContext;
  darek: Darek;
  onClose: () => void;
}) {
  const router = useRouter();
  const [cena, setCena] = React.useState(darek.cena != null ? String(darek.cena) : "");
  const [doVydaju, setDoVydaju] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function potvrdit() {
    const castka = cena.trim() ? Number(cena.replace(/\s/g, "").replace(",", ".")) : null;
    if (doVydaju && (castka === null || !Number.isFinite(castka) || castka <= 0)) {
      setError("Pro výdaj napište, kolik dárek stál.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    let expenseId: string | null = null;
    if (doVydaju && castka) {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          family_id: session.family.id,
          child_id: darek.child_id,
          category: "fun",
          title: `Dárek: ${darek.nazev}`,
          amount: castka,
          currency: session.family.currency,
          spent_on: toDateKey(new Date()),
          paid_by: session.userId,
          split_percent: 50,
          created_by: session.userId,
        })
        .select("id")
        .single();
      if (error) {
        setBusy(false);
        setError(hlaskaChyby(error));
        return;
      }
      expenseId = data.id as string;
    }
    const { error } = await supabase
      .from("darky")
      .update({
        koupeno_at: new Date().toISOString(),
        expense_id: expenseId,
        ...(castka !== null && Number.isFinite(castka) ? { cena: castka } : {}),
      })
      .eq("id", darek.id);
    setBusy(false);
    if (error) {
      setError(hlaskaChyby(error));
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Koupeno"
      description={darek.nazev}
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={busy}>
            Zrušit
          </Button>
          <Button className="flex-1" onClick={potvrdit} disabled={busy}>
            {busy ? <Spinner /> : "Potvrdit"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Field label="Za kolik">
          <Input inputMode="decimal" placeholder="0" value={cena} onChange={(e) => setCena(e.target.value)} />
        </Field>
        <Checkbox
          label="Přidat do výdajů"
          description="Jako Zábava, platili jste vy, dělí se napůl. Upravit jde ve Výdajích."
          checked={doVydaju}
          onChange={(e) => setDoVydaju(e.target.checked)}
        />
      </div>
    </Sheet>
  );
}

function Smazat({ darek, onClose }: { darek: Darek; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function smazat() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("darky").delete().eq("id", darek.id);
    setBusy(false);
    if (error) {
      setError(hlaskaChyby(error));
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <ConfirmSheet
      open
      onClose={onClose}
      onConfirm={smazat}
      busy={busy}
      title="Smazat nápad?"
      message={error ?? `„${darek.nazev}“ zmizí ze seznamu u obou rodičů.`}
    />
  );
}
