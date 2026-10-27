"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { Dot } from "@/components/ui/badge";
import { sideBg, sideColor, sideLabel } from "@/lib/members";
import { hlaskaChyby, cn } from "@/lib/format";
import { toDateKey } from "@/lib/dates";
import { vychoziTerminOdpovedi } from "@/lib/zadosti";
import { oznamZadost } from "./zadosti-zmeny";
import type { CustodySide, SessionContext } from "@/lib/types";

/**
 * Návrh změny rozvrhu — v rodině se dvěma rodiči místo přímé úpravy dne.
 *
 * Bez souhlasu druhého rodiče se kalendář nezmění (hlídá to databáze,
 * migrace 0032). Návrh i odpověď se zapíšou do Zpráv.
 */
export function NavrhZmeny({
  session,
  dayKey,
  childId,
  aktualniStrana,
}: {
  session: SessionContext;
  dayKey: string;
  childId: string | null;
  aktualniStrana: CustodySide | null;
}) {
  const router = useRouter();
  const dnes = toDateKey(new Date());
  const [otevreno, setOtevreno] = React.useState(false);
  const [strana, setStrana] = React.useState<CustodySide>(aktualniStrana === "a" ? "b" : "a");
  const [doDne, setDoDne] = React.useState(dayKey);
  const [duvod, setDuvod] = React.useState("");
  const [termin, setTermin] = React.useState(vychoziTerminOdpovedi(dayKey, dnes));
  const [busy, setBusy] = React.useState(false);
  const [chyba, setChyba] = React.useState<string | null>(null);
  const [odeslano, setOdeslano] = React.useState(false);

  if (dayKey < dnes) {
    return (
      <p className="text-xs text-ink-muted">
        Minulé dny se nemění. Změny rozvrhu schvalují oba rodiče předem.
      </p>
    );
  }

  if (odeslano) {
    return (
      <Alert tone="success">
        Návrh je odeslaný. Druhý rodič ho uvidí v Kalendáři a ve Zprávách. Do jeho souhlasu se
        rozvrh nemění.
      </Alert>
    );
  }

  if (!otevreno) {
    return (
      <div className="space-y-1.5">
        <Button variant="secondary" size="sm" onClick={() => setOtevreno(true)}>
          <Send className="h-4 w-4" /> Navrhnout změnu
        </Button>
        <p className="text-xs text-ink-muted">
          Rozvrh mění oba rodiče společně: vy navrhnete, druhý rodič schválí.
        </p>
      </div>
    );
  }

  async function odeslat() {
    setBusy(true);
    setChyba(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("navrhni_zmenu", {
      target_family: session.family.id,
      dite: childId,
      od: dayKey,
      do_dne: doDne < dayKey ? dayKey : doDne,
      strana,
      duvod,
      odpovedet_do: termin,
    });
    setBusy(false);
    if (error) {
      setChyba(hlaskaChyby(error));
      return;
    }
    if (typeof data === "string") oznamZadost(data);
    setOdeslano(true);
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-3">
      <p className="text-sm font-medium text-ink">Navrhnout změnu</p>

      <Field label="U koho mají děti být">
        <div className="flex flex-wrap gap-2">
          {(["a", "b"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStrana(s)}
              aria-pressed={strana === s}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
                strana === s ? "border-transparent" : "border-line-strong hover:bg-surface",
              )}
              style={strana === s ? { backgroundColor: sideBg(session.members, s) } : undefined}
            >
              <Dot color={sideColor(session.members, s)} />
              {sideLabel(session.members, s)}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Do kdy (včetně)">
          <Input type="date" min={dayKey} value={doDne} onChange={(e) => setDoDne(e.target.value)} />
        </Field>
        <Field label="Odpověď do">
          <Input
            type="date"
            min={dnes}
            max={dayKey}
            value={termin}
            onChange={(e) => setTermin(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Důvod" hint="nepovinné">
        <Textarea
          rows={2}
          maxLength={1000}
          placeholder="Např. svatba sestry, služební cesta"
          value={duvod}
          onChange={(e) => setDuvod(e.target.value)}
        />
      </Field>

      <p className="text-xs text-ink-muted">
        Návrh se zapíše do Zpráv a nepůjde ho upravit ani smazat — jen zrušit, dokud ho druhý
        rodič nevyřídí.
      </p>

      {chyba ? <Alert tone="danger">{chyba}</Alert> : null}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={odeslat}>
          <Send className="h-4 w-4" /> Odeslat návrh
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => setOtevreno(false)}>
          Zrušit
        </Button>
      </div>
    </div>
  );
}
