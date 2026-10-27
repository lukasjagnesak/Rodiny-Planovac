"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { Dot } from "@/components/ui/badge";
import { sideColor, sideLabel } from "@/lib/members";
import { rozsahDnu } from "@/lib/zadosti";
import { hlaskaChyby } from "@/lib/format";
import type { SessionContext, ZadostZmeny } from "@/lib/types";

/** Po odeslání návrhu nebo odpovědi upozorní druhou stranu. Chyba nevadí. */
export function oznamZadost(zadostId: string) {
  void fetch("/api/zadosti/oznam", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ zadostId }),
  }).catch(() => {});
}

/**
 * Nevyřízené žádosti o změnu rozvrhu.
 *
 * Druhý rodič tu schvaluje nebo zamítá, navrhující vidí, že se čeká,
 * a může návrh zrušit. Stojí nad kalendářem i na přehledu: žádost,
 * kterou nikdo neuvidí, je horší než žádná — druhý rodič by se pak
 * mohl hájit, že o ní nevěděl.
 */
export function ZadostiZmeny({
  session,
  zadosti,
}: {
  session: SessionContext;
  zadosti: ZadostZmeny[];
}) {
  if (zadosti.length === 0) return null;
  return (
    <div className="space-y-3">
      {zadosti.map((z) => (
        <KartaZadosti key={z.id} session={session} zadost={z} />
      ))}
    </div>
  );
}

function KartaZadosti({ session, zadost }: { session: SessionContext; zadost: ZadostZmeny }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [chyba, setChyba] = React.useState<string | null>(null);
  const [zamitam, setZamitam] = React.useState(false);
  const [text, setText] = React.useState("");

  const moje = zadost.navrhl === session.userId;
  const muzeOdpovidat = !moje && session.myMembership.role !== "viewer";
  const dite = zadost.child_id
    ? session.children.find((c) => c.id === zadost.child_id)?.name
    : null;
  const termin = new Date(`${zadost.odpovedet_do}T12:00:00`).toLocaleDateString("cs-CZ");
  const poTerminu = zadost.odpovedet_do < new Date().toISOString().slice(0, 10);

  async function zavolej(
    fn: () => PromiseLike<{ error: { message: string; code?: string } | null }>,
  ) {
    setBusy(true);
    setChyba(null);
    const { error } = await fn();
    setBusy(false);
    if (error) {
      setChyba(hlaskaChyby(error));
      return;
    }
    oznamZadost(zadost.id);
    router.refresh();
  }

  const supabase = createClient();

  return (
    <div className="rounded-2xl border border-warning/40 bg-warning-soft p-4">
      <div className="flex items-start gap-3">
        <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-ink">
            {moje ? "Navrhli jste změnu rozvrhu" : `${zadost.navrhl_jmeno} navrhuje změnu rozvrhu`}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-ink">
            <span className="font-medium">{rozsahDnu(zadost.od, zadost.do_dne)}</span>
            {dite ? <span className="text-ink-muted">({dite})</span> : null}
            <span className="text-ink-muted">u:</span>
            <Dot color={sideColor(session.members, zadost.strana)} />
            <span className="font-medium">{sideLabel(session.members, zadost.strana)}</span>
          </p>
          {zadost.duvod ? <p className="mt-1 text-ink-muted">Důvod: {zadost.duvod}</p> : null}
          <p className={poTerminu ? "mt-1 font-medium text-danger" : "mt-1 text-ink-subtle"}>
            {poTerminu
              ? `Bez odpovědi od ${termin}. Rozvrh se bez souhlasu nemění.`
              : `Odpověď do ${termin}. Bez souhlasu se rozvrh nemění.`}
          </p>
        </div>
      </div>

      {chyba ? (
        <Alert tone="danger" className="mt-3">
          {chyba}
        </Alert>
      ) : null}

      {muzeOdpovidat && !zamitam ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              zavolej(() =>
                supabase.rpc("odpovez_na_zadost", {
                  zadost: zadost.id,
                  schvalit: true,
                  text_odpovedi: null,
                }),
              )
            }
          >
            <Check className="h-4 w-4" /> Souhlasím
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setZamitam(true)}>
            <X className="h-4 w-4" /> Nesouhlasím
          </Button>
        </div>
      ) : null}

      {muzeOdpovidat && zamitam ? (
        <div className="mt-3 space-y-2">
          <Textarea
            rows={2}
            maxLength={1000}
            placeholder="Proč ne, případně jiný návrh (nepovinné)"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="text-xs text-ink-subtle">
            Odpověď se zapíše do Zpráv a nepůjde ji upravit ani smazat.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="danger"
              disabled={busy}
              onClick={() =>
                zavolej(() =>
                  supabase.rpc("odpovez_na_zadost", {
                    zadost: zadost.id,
                    schvalit: false,
                    text_odpovedi: text,
                  }),
                )
              }
            >
              Odeslat nesouhlas
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setZamitam(false)}>
              Zpět
            </Button>
          </div>
        </div>
      ) : null}

      {moje ? (
        <div className="mt-3">
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => zavolej(() => supabase.rpc("zrus_zadost", { zadost: zadost.id }))}
          >
            Zrušit návrh
          </Button>
        </div>
      ) : null}
    </div>
  );
}
