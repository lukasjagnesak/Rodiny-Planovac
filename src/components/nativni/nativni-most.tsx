"use client";

import * as React from "react";
import { jeNativni, plugin, type Posluchac } from "@/lib/nativni-most";
import { SCHEMA_APLIKACE } from "@/lib/nativni";
import { registrujNativniPush } from "@/lib/push-nativni-klient";

type AppPlugin = {
  addListener: (udalost: string, fn: (data: { url: string }) => void) => Promise<Posluchac>;
};
type BrowserPlugin = { close: () => Promise<void> };

/**
 * Most mezi webem a aplikací z obchodu. Na webu nedělá nic.
 *
 * - `cz.klidoo.app://auth?code=…` (návrat z přihlášení v prohlížeči):
 *   zavře prohlížeč a dokončí přihlášení na `/auth/callback`.
 * - `https://klidoo.cz/…` (odkaz z e-mailu otevřený v aplikaci): přejde
 *   na tutéž stránku uvnitř aplikace.
 * - Po přihlášení zaregistruje zařízení pro push notifikace.
 */
export function NativniMost() {
  React.useEffect(() => {
    if (!jeNativni()) return;
    const app = plugin<AppPlugin>("App");
    if (!app) return;

    let posluchac: Posluchac | null = null;
    void app
      .addListener("appUrlOpen", ({ url }) => {
        let odkaz: URL;
        try {
          odkaz = new URL(url);
        } catch {
          return;
        }
        if (odkaz.protocol === `${SCHEMA_APLIKACE}:` && odkaz.host === "auth") {
          void plugin<BrowserPlugin>("Browser")?.close().catch(() => undefined);
          window.location.assign(`/auth/callback${odkaz.search}`);
          return;
        }
        if (odkaz.protocol === "https:" && odkaz.host === window.location.host) {
          window.location.assign(`${odkaz.pathname}${odkaz.search}`);
        }
      })
      .then((p) => {
        posluchac = p;
      });

    // Na přehledu (tedy po přihlášení) se jednou zeptá na notifikace —
    // připomínky předávek jsou to hlavní, kvůli čemu se aplikace instaluje.
    // Jinde jen obnoví token, pokud už povolení je.
    const klic = "klidoo_push_dotaz";
    let uzSePtal = true;
    try {
      uzSePtal = window.localStorage.getItem(klic) === "1";
    } catch {
      /* bez úložiště se jen neptáme */
    }
    const ptat = !uzSePtal && window.location.pathname.startsWith("/prehled");
    void registrujNativniPush({ vyzadat: ptat }).then(() => {
      if (ptat) {
        try {
          window.localStorage.setItem(klic, "1");
        } catch {
          /* nevadí */
        }
      }
    });

    return () => {
      void posluchac?.remove();
    };
  }, []);

  return null;
}
