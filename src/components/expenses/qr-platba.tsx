"use client";

import * as React from "react";
import QRCode from "qrcode";
import { formatMoney } from "@/lib/format";
import { formatUcet, spayd } from "@/lib/ucet";

/**
 * QR Platba (SPAYD) pro žádost o proplacení. Kreslí se v prohlížeči —
 * účet ani částka nikam neodcházejí. Černá na bílé i v tmavém režimu,
 * jinak by ho část bankovních aplikací nepřečetla.
 */
export function QrPlatba({
  iban,
  castka,
  mena,
  zprava,
}: {
  iban: string;
  castka: number;
  mena: string;
  zprava: string;
}) {
  const [svg, setSvg] = React.useState<string | null>(null);
  const obsah = spayd({ iban, castka, mena, zprava });

  React.useEffect(() => {
    let zruseno = false;
    QRCode.toString(obsah, { type: "svg", margin: 2, errorCorrectionLevel: "M" })
      .then((s) => {
        if (!zruseno) setSvg(s);
      })
      .catch(() => {
        if (!zruseno) setSvg(null);
      });
    return () => {
      zruseno = true;
    };
  }, [obsah]);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
      <div
        role="img"
        aria-label="QR Platba"
        className="h-28 w-28 shrink-0 rounded-lg bg-white p-1 [&>svg]:h-full [&>svg]:w-full"
        // SVG vytváří knihovna jen z čísel a cest — žádný text od uživatele.
        dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      />
      <div className="min-w-0 text-sm">
        <p className="font-medium text-ink">QR Platba</p>
        <p className="text-ink-muted">Naskenujte v aplikaci své banky.</p>
        <p className="mt-1.5 tnum text-ink">{formatMoney(castka, mena)}</p>
        <p className="tnum break-all text-ink-muted">{formatUcet(iban)}</p>
      </div>
    </div>
  );
}
