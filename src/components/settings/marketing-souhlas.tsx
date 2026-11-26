"use client";

import * as React from "react";
import { Mail } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { MARKETING_SOUHLAS } from "@/lib/marketing-souhlas";

type Stav = "zadny" | "ceka" | "odebira" | "zrusen";

/**
 * Marketingové e-maily v nastavení. Změna se ukládá hned po kliknutí —
 * odvolání musí být stejně snadné jako udělení.
 */
export function MarketingSouhlas({ stav: vychozi }: { stav: Stav }) {
  const [stav, setStav] = React.useState<Stav>(vychozi);
  const [uklada, setUklada] = React.useState(false);
  const [zprava, setZprava] = React.useState<{ ton: "success" | "danger"; text: string } | null>(null);
  const zapnuto = stav === "ceka" || stav === "odebira";

  async function zmen(novy: boolean) {
    setUklada(true);
    setZprava(null);
    const odpoved = await fetch("/api/marketing/souhlas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ souhlas: novy }),
    }).catch(() => null);
    setUklada(false);
    const data = (await odpoved?.json().catch(() => null)) as { error?: string } | null;

    if (!odpoved?.ok) {
      setZprava({ ton: "danger", text: data?.error ?? "Změnu se nepodařilo uložit. Zkuste to znovu." });
      return;
    }
    setStav(novy ? "ceka" : "zrusen");
    setZprava({
      ton: "success",
      text: novy
        ? "Hotovo. Do schránky vám přijde e-mail, ve kterém odběr jedním klepnutím potvrdíte."
        : "Hotovo. Novinky a nabídky vám už posílat nebudeme. Zprávy k účtu chodí dál.",
    });
  }

  return (
    <Card>
      <CardHeader title="E-maily od Klidoo" />
      <div className="space-y-4 px-4 pb-5 sm:px-5">
        <p className="text-sm text-ink-muted">
          Zprávy k účtu (pozvánky, platby, připomínky) chodí vždycky. Tady si vyberete jen
          novinky a nabídky.
        </p>

        {stav === "zrusen" && !zprava ? (
          <Alert tone="info">
            Odběr novinek jste zrušili. Pokud ho chcete znovu, napište nám na info@klidoo.cz.
          </Alert>
        ) : (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4">
            <input
              type="checkbox"
              checked={zapnuto}
              disabled={uklada || stav === "zrusen"}
              onChange={(e) => zmen(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-line-strong accent-[var(--brand)]"
            />
            <span className="text-[0.95rem] leading-relaxed text-ink">
              <Mail className="mr-1.5 inline h-4 w-4 text-brand" aria-hidden />
              {MARKETING_SOUHLAS.text}
            </span>
          </label>
        )}

        {stav === "ceka" && !zprava ? (
          <p className="text-xs text-ink-subtle">Čekáme, až odběr potvrdíte v e-mailu.</p>
        ) : null}

        {zprava ? (
          <Alert tone={zprava.ton}>
            <span role="status">{zprava.text}</span>
          </Alert>
        ) : null}
      </div>
    </Card>
  );
}
