"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  aktualizujConsentMode,
  marketingZobrazeni,
  nactiGoogleAds,
  nactiGoogleAnalytics,
  nactiMetaPixel,
  pripravConsentMode,
} from "@/lib/marketing";
import { prectiSouhlas, type Souhlas } from "@/lib/souhlas";

/**
 * Spouštěč měřicích skriptů.
 *
 * Consent Mode se nastaví hned, skripty až po souhlasu. Pořadí je
 * podstatné: kdyby se gtag.js načetl dřív, poslal by první událost
 * podle výchozího stavu, který je v Googlu „povoleno".
 */
export function MereniSkripty() {
  const cesta = usePathname();
  const [souhlas, setSouhlas] = React.useState<Souhlas | null>(null);

  React.useEffect(() => {
    pripravConsentMode();
    setSouhlas(prectiSouhlas());

    const zmena = (e: Event) => setSouhlas((e as CustomEvent<Souhlas | null>).detail);
    window.addEventListener("klidoo-souhlas", zmena);
    return () => window.removeEventListener("klidoo-souhlas", zmena);
  }, []);

  React.useEffect(() => {
    if (!souhlas) return;

    aktualizujConsentMode(souhlas);
    if (souhlas.analytika) nactiGoogleAnalytics();
    if (souhlas.marketing) {
      nactiMetaPixel();
      // Google Ads patří k marketingovému souhlasu, ne k analytickému —
      // je to reklamní měření, i když jede přes stejný gtag.
      nactiGoogleAds();
    }
  }, [souhlas]);

  // Next mění stránky bez načtení dokumentu, takže zobrazení musíme
  // hlásit sami — jinak by GA vidělo jen tu první.
  React.useEffect(() => {
    if (!souhlas || (!souhlas.analytika && !souhlas.marketing)) return;
    marketingZobrazeni(cesta);
  }, [cesta, souhlas]);

  return null;
}
