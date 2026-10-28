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
import { MERICI_SKRIPTY, smiMerit } from "@/lib/mereni-hranice";
import { prectiSouhlas, type Souhlas } from "@/lib/souhlas";

/**
 * Spouštěč měřicích skriptů.
 *
 * Consent Mode se nastaví hned, skripty až po souhlasu. Pořadí je
 * podstatné: kdyby se gtag.js načetl dřív, poslal by první událost
 * podle výchozího stavu, který je v Googlu „povoleno".
 *
 * A jen na veřejném webu (`smiMerit`). Next přechází mezi stránkami bez
 * načtení dokumentu, takže skript jednou vložený na webu by jinak jel
 * dál i v aplikaci. Kdo se do ní takhle dostane, dostane ji načtenou
 * znovu a čistou — přihlášení a registrace do ní proto vedou rovnou
 * plným načtením, aby se to nestávalo.
 */
export function MereniSkripty() {
  const cesta = usePathname();
  const smi = smiMerit(cesta);
  const [souhlas, setSouhlas] = React.useState<Souhlas | null>(null);
  const pripraveno = React.useRef(false);

  React.useEffect(() => {
    if (smi) return;
    const nacteno = MERICI_SKRIPTY.some((id) => document.getElementById(id));
    if (nacteno) window.location.reload();
  }, [smi]);

  React.useEffect(() => {
    // Až na první veřejné stránce — v aplikaci nemá existovat ani fronta gtagu.
    if (!smi || pripraveno.current) return;
    pripraveno.current = true;
    pripravConsentMode();
  }, [smi]);

  React.useEffect(() => {
    setSouhlas(prectiSouhlas());

    const zmena = (e: Event) => setSouhlas((e as CustomEvent<Souhlas | null>).detail);
    window.addEventListener("klidoo-souhlas", zmena);
    return () => window.removeEventListener("klidoo-souhlas", zmena);
  }, []);

  React.useEffect(() => {
    if (!souhlas || !smi) return;

    aktualizujConsentMode(souhlas);
    if (souhlas.analytika) nactiGoogleAnalytics();
    if (souhlas.marketing) {
      nactiMetaPixel();
      // Google Ads patří k marketingovému souhlasu, ne k analytickému —
      // je to reklamní měření, i když jede přes stejný gtag.
      nactiGoogleAds();
    }
  }, [souhlas, smi]);

  // Next mění stránky bez načtení dokumentu, takže zobrazení musíme
  // hlásit sami — jinak by GA vidělo jen tu první.
  React.useEffect(() => {
    if (!smi || !souhlas || (!souhlas.analytika && !souhlas.marketing)) return;
    marketingZobrazeni(cesta);
  }, [cesta, souhlas, smi]);

  return null;
}
