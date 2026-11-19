"use client";

import * as React from "react";
import { Mail } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { MARKETING_SOUHLAS } from "@/lib/marketing-souhlas";

/**
 * Marketingový souhlas v nastavení. Změna se ukládá hned po kliknutí —
 * odvolání musí být stejně snadné jako udělení.
 */
export function MarketingSouhlas({
  vychozi,
  souhlasOd,
  ceka,
}: {
  vychozi: boolean;
  souhlasOd: string | null;
  ceka: boolean;
}) {
  const [souhlas, setSouhlas] = React.useState(vychozi);
  const [uklada, setUklada] = React.useState(false);
  const [zprava, setZprava] = React.useState<{ ton: "success" | "danger"; text: string } | null>(null);

  async function zmen(novy: boolean) {
    setUklada(true);
    setZprava(null);
    const odpoved = await fetch("/api/marketing/souhlas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ souhlas: novy }),
    }).catch(() => null);
    setUklada(false);

    if (!odpoved?.ok) {
      setZprava({ ton: "danger", text: "Změnu se nepodařilo uložit. Zkuste to znovu." });
      return;
    }
    setSouhlas(novy);
    setZprava({
      ton: "success",
      text: novy
        ? "Hotovo. Pokud jsme vám ještě nic neposílali, přijde nejdřív e-mail s potvrzením odběru."
        : "Hotovo. Tipy a nabídky vám už posílat nebudeme. Zprávy k účtu chodí dál.",
    });
  }

  return (
    <Card>
      <CardHeader title="E-maily od Klidoo" />
      <div className="space-y-4 px-4 pb-5 sm:px-5">
        <p className="text-sm text-ink-muted">
          Zprávy k účtu (pozvánky, platby, připomínky) chodí vždycky. Tady si vyberete jen
          tipy, novinky a nabídky.
        </p>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4">
          <input
            type="checkbox"
            checked={souhlas}
            disabled={uklada}
            onChange={(e) => zmen(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-line-strong accent-[var(--brand)]"
          />
          <span className="text-[0.95rem] leading-relaxed text-ink">
            <Mail className="mr-1.5 inline h-4 w-4 text-brand" aria-hidden />
            {MARKETING_SOUHLAS.text}
          </span>
        </label>

        {souhlas && souhlasOd ? (
          <p className="text-xs text-ink-subtle">
            Souhlas platí od {new Date(souhlasOd).toLocaleDateString("cs-CZ")}.
            {ceka ? " Čekáme, až potvrdíte odběr v e-mailu." : ""}
          </p>
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
