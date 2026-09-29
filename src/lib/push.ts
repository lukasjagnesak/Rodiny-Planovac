import "server-only";

import webpush from "web-push";

/**
 * Nativní push notifikace (Web Push).
 *
 * Nahrazuje Telegram: zpráva chodí přímo do zařízení, na kterém má
 * uživatel Klidoo nainstalovaný jako appku — nic se nemusí párovat
 * s cizí službou. VAPID klíče identifikují náš server vůči prohlížeči,
 * ne konkrétního uživatele; jsou stejné pro celou aplikaci.
 */

let nastaveno = false;

function zajistiNastaveni(): boolean {
  if (nastaveno) return true;
  const verejny = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const soukromy = process.env.VAPID_PRIVATE_KEY;
  if (!verejny || !soukromy) return false;

  webpush.setVapidDetails(
    `mailto:${process.env.SMTP_FROM_EMAIL || "info@klidoo.cz"}`,
    verejny,
    soukromy,
  );
  nastaveno = true;
  return true;
}

export function pushJeNastaveny(): boolean {
  return zajistiNastaveni();
}

export interface PushOdber {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushZprava {
  titulek: string;
  telo: string;
  odkaz: string;
  tag?: string;
}

/**
 * Výsledek `gone: true` znamená, že prohlížeč odběr sám zrušil (odinstalace,
 * vymazaná data) — volající má takový záznam smazat, další pokus je zbytečný.
 */
export async function posliPush(
  odber: PushOdber,
  zprava: PushZprava,
): Promise<{ ok: boolean; gone?: boolean; chyba?: string }> {
  if (!zajistiNastaveni()) {
    return { ok: false, chyba: "VAPID klíče nejsou nastavené." };
  }

  try {
    await webpush.sendNotification(
      { endpoint: odber.endpoint, keys: { p256dh: odber.p256dh, auth: odber.auth } },
      JSON.stringify({ titulek: zprava.titulek, telo: zprava.telo, odkaz: zprava.odkaz, tag: zprava.tag }),
    );
    return { ok: true };
  } catch (chyba) {
    const statusCode = (chyba as { statusCode?: number }).statusCode;
    // 404/410 = prohlížeč odběr zahodil, další pokusy by jen sbíraly chyby.
    if (statusCode === 404 || statusCode === 410) {
      return { ok: false, gone: true, chyba: "Odběr už neplatí." };
    }
    return { ok: false, chyba: chyba instanceof Error ? chyba.message : "Odeslání selhalo." };
  }
}
