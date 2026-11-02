"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, ConfirmSheet } from "@/components/ui/sheet";
import { Alert, Spinner } from "@/components/ui/misc";
import { Ikona } from "@/components/ui/ikona";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatDayShort } from "@/lib/dates";
import { cn, formatMoney, hlaskaChyby } from "@/lib/format";
import { rozpisDluhu, maZivouZadost, smimVyrovnat, type PolozkaDluhu } from "@/lib/vyrovnani";
import { maDvaRodice } from "@/lib/zadosti";
import { StitekProplaceni } from "./proplaceni";
import { QrPlatba } from "./qr-platba";
import { QrKZaslani } from "./qr-k-zaslani";
import type { Expense, SessionContext } from "@/lib/types";

/**
 * Kdo komu dluží a za co — přes všechny nevyrovnané výdaje.
 * Zaplacení potvrzuje ten, komu se platilo (migrace 0039).
 */
export function VyrovnaniSheet({
  session,
  nevyrovnane,
  onClose,
}: {
  session: SessionContext;
  nevyrovnane: Expense[];
  onClose: () => void;
}) {
  const router = useRouter();
  const ja = session.userId;
  const mena = session.family.currency;
  const dvaRodice = maDvaRodice(session.members);
  const muzeUpravovat = session.myMembership.role !== "viewer";
  const r = rozpisDluhu(nevyrovnane, ja);
  const druhy = session.members.find(
    (m) => m.userId !== ja && m.side && (m.role === "owner" || m.role === "parent"),
  );
  const druhyJmeno = druhy?.name ?? "druhý rodič";

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [potvrzujiVse, setPotvrzujiVse] = React.useState(false);
  const [posilam, setPosilam] = React.useState(false);

  const kVyrovnani = r.mneDluzi.filter((p) => smimVyrovnat(p.expense, ja, dvaRodice));
  const kVyrovnaniCelkem = kVyrovnani.reduce((s, p) => s + p.podil, 0);
  // Kdo je v Klidoo sám, odkliká i to, co dluží on.
  const mojeDluhyKVyrovnani = dvaRodice
    ? []
    : r.dluzim.filter((p) => smimVyrovnat(p.expense, ja, dvaRodice));

  async function vyrovnej(ids: string[]) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("vyrovnej_vydaje", { vydaje: ids });
    setBusy(false);
    setPotvrzujiVse(false);
    if (error) {
      setError(hlaskaChyby(error));
      return;
    }
    router.refresh();
  }

  // QR na doplatek: jen když dlužím víc, než mi dluží, a druhý má účet.
  const doplatek = -r.saldo;
  const qr = doplatek > 0 && druhy?.ucet && dvaRodice;

  return (
    <>
      <Sheet open onClose={onClose} title="Vyrovnání" description="Kdo komu dluží a za co" size="lg">
        <div className="space-y-5">
          {error ? <Alert tone="danger">{error}</Alert> : null}

          <div
            className={cn(
              "rounded-xl p-4 text-center",
              r.saldo > 0 ? "bg-success/10" : r.saldo < 0 ? "bg-danger/10" : "bg-surface-2",
            )}
          >
            {r.saldo === 0 ? (
              <p className="font-medium text-ink">
                {r.mneDluzi.length + r.dluzim.length === 0 ? "Všechno je vyrovnané." : "Vychází to nastejno."}
              </p>
            ) : (
              <>
                <p className="text-sm text-ink-muted">
                  {r.saldo > 0 ? `Po započtení vám dluží ${druhyJmeno}` : `Po započtení dlužíte: ${druhyJmeno}`}
                </p>
                <p
                  className={cn(
                    "tnum mt-0.5 text-2xl font-semibold",
                    r.saldo > 0 ? "text-success" : "text-danger",
                  )}
                >
                  {formatMoney(Math.abs(r.saldo), mena)}
                </p>
              </>
            )}
            {r.mneDluzi.length > 0 && r.dluzim.length > 0 ? (
              <p className="tnum mt-1 text-xs text-ink-subtle">
                dluží vám {formatMoney(r.mneDluziCelkem, mena)} · dlužíte{" "}
                {formatMoney(r.dluzimCelkem, mena)}
              </p>
            ) : null}
          </div>

          {/* Pro druhého rodiče, který Klidoo nemá (nebo ho neotevře):
              obrázek s QR a rozpisem, který se pošle přes WhatsApp, SMS… */}
          {muzeUpravovat && r.saldo > 0 ? (
            <Button variant="secondary" className="w-full" onClick={() => setPosilam(true)}>
              <QrCode className="h-4 w-4" /> Poslat QR k zaplacení
            </Button>
          ) : null}

          {qr ? (
            <QrPlatba
              iban={druhy!.ucet!}
              castka={doplatek}
              mena={mena}
              zprava="Klidoo: vyrovnani vydaju"
            />
          ) : null}

          <Seznam
            nazev={`Dluží vám${dvaRodice ? ` (${druhyJmeno})` : ""}`}
            polozky={r.mneDluzi}
            celkem={r.mneDluziCelkem}
            session={session}
            akce={(p) =>
              muzeUpravovat && smimVyrovnat(p.expense, ja, dvaRodice) ? (
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => vyrovnej([p.expense.id])}>
                  <Check className="h-3.5 w-3.5" /> Zaplaceno
                </Button>
              ) : null
            }
            prazdne="Nic vám nedluží."
          />

          {muzeUpravovat && kVyrovnani.length > 1 ? (
            <Button className="w-full" disabled={busy} onClick={() => setPotvrzujiVse(true)}>
              {busy ? <Spinner /> : `Vše zaplaceno (${formatMoney(kVyrovnaniCelkem, mena)})`}
            </Button>
          ) : null}

          <Seznam
            nazev="Dlužíte vy"
            polozky={r.dluzim}
            celkem={r.dluzimCelkem}
            session={session}
            akce={(p) =>
              muzeUpravovat && smimVyrovnat(p.expense, ja, dvaRodice) ? (
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => vyrovnej([p.expense.id])}>
                  <Check className="h-3.5 w-3.5" /> Zaplaceno
                </Button>
              ) : null
            }
            prazdne="Nic nedlužíte."
          />
          {mojeDluhyKVyrovnani.length === 0 && r.dluzim.length > 0 && dvaRodice ? (
            <p className="text-xs text-ink-subtle">
              Až zaplatíte, potvrdí to {druhyJmeno} u sebe ve Vyrovnání. Výdaje pak zmizí z obou
              seznamů.
            </p>
          ) : null}

          {dvaRodice ? (
            <p className="text-xs text-ink-subtle">
              Zaplacení potvrzuje ten, komu se platilo — ví, jestli peníze přišly. Potvrzení se
              zapíše do Zpráv.
            </p>
          ) : null}
        </div>
      </Sheet>

      {posilam ? (
        <QrKZaslani
          session={session}
          polozky={r.mneDluzi}
          castka={r.saldo}
          odecteno={r.dluzimCelkem}
          onClose={() => setPosilam(false)}
        />
      ) : null}

      <ConfirmSheet
        open={potvrzujiVse}
        onClose={() => setPotvrzujiVse(false)}
        onConfirm={() => vyrovnej(kVyrovnani.map((p) => p.expense.id))}
        busy={busy}
        confirmLabel="Potvrdit"
        title="Vše zaplaceno?"
        message={`Potvrzujete, že vám přišlo ${formatMoney(kVyrovnaniCelkem, mena)} za ${kVyrovnani.length} ${
          kVyrovnani.length < 5 ? "výdaje" : "výdajů"
        }.${dvaRodice ? ` ${druhyJmeno} to uvidí ve Zprávách.` : ""}`}
      />
    </>
  );
}

function Seznam({
  nazev,
  polozky,
  celkem,
  session,
  akce,
  prazdne,
}: {
  nazev: string;
  polozky: PolozkaDluhu[];
  celkem: number;
  session: SessionContext;
  akce: (p: PolozkaDluhu) => React.ReactNode;
  prazdne: string;
}) {
  const mena = session.family.currency;
  return (
    <section>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{nazev}</p>
        {polozky.length > 0 ? (
          <p className="tnum text-sm font-medium text-ink">{formatMoney(celkem, mena)}</p>
        ) : null}
      </div>
      {polozky.length === 0 ? (
        <p className="text-sm text-ink-muted">{prazdne}</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {polozky.map((p) => {
            const e = p.expense;
            const meta = EXPENSE_CATEGORIES[e.category];
            const dite = session.children.find((c) => c.id === e.child_id);
            return (
              <li key={e.id} className="flex items-center gap-3 p-3">
                <span style={{ color: meta.color }}>
                  <Ikona nazev={meta.ikona} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="truncate font-medium text-ink">{e.title}</span>
                    {dite ? <Badge color={dite.color}>{dite.name}</Badge> : null}
                    {maZivouZadost(e) ? <StitekProplaceni expense={e} /> : null}
                  </p>
                  <p className="tnum text-xs text-ink-muted">
                    {formatDayShort(e.spent_on)} · celkem {formatMoney(Number(e.amount), mena)} ·{" "}
                    {`${Number(e.split_percent)}\u00a0%`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="tnum text-sm font-semibold text-ink">
                    {formatMoney(p.podil, mena)}
                  </span>
                  {akce(p)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
