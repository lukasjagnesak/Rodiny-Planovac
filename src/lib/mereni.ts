/**
 * Odeslání události měření z prohlížeče.
 *
 * `sendBeacon` schválně: přežije odchod ze stránky a neblokuje nic,
 * co uživatel dělá. Když se nepovede, nic se neděje — měření je vždycky
 * až za funkčností.
 */

import { zapamatujPuvod } from "./atribuce";

export function zmer(druh: string, cesta?: string): void {
  if (typeof window === "undefined") return;

  try {
    const odkud = zapamatujPuvod();
    const telo = JSON.stringify({
      druh,
      cesta: cesta ?? window.location.pathname,
      odkud: {
        referrer: odkud.referrer,
        utm_source: odkud.utm_source,
        utm_medium: odkud.utm_medium,
        utm_campaign: odkud.utm_campaign,
        ref: odkud.ref,
      },
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/t", new Blob([telo], { type: "application/json" }));
      return;
    }

    void fetch("/api/t", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: telo,
      keepalive: true,
    });
  } catch {
    // Zakázané úložiště, blokované volání — měření prostě nebude.
  }
}
