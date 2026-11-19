import { jeNativni, platforma, plugin, type Posluchac } from "./nativni-most";

type Opravneni = { receive: "granted" | "denied" | "prompt" | "prompt-with-rationale" };
type PushPlugin = {
  checkPermissions: () => Promise<Opravneni>;
  requestPermissions: () => Promise<Opravneni>;
  register: () => Promise<void>;
  addListener: (udalost: string, fn: (data: never) => void) => Promise<Posluchac>;
};

let posluchaci = false;

export type StavNativnihoPush = "nepodporovano" | "zapnuto" | "vypnuto" | "zamitnuto";

/**
 * Push notifikace v aplikaci z obchodu.
 *
 * Bez `vyzadat` jen obnoví token, pokud už je povolení dané (token se
 * může změnit po aktualizaci systému). S `vyzadat` se zeptá — to dělá
 * přehled jednou po přihlášení a tlačítko v Nastavení → Notifikace.
 */
export async function registrujNativniPush(volby: { vyzadat?: boolean } = {}): Promise<StavNativnihoPush> {
  if (!jeNativni()) return "nepodporovano";
  const push = plugin<PushPlugin>("PushNotifications");
  const kde = platforma();
  if (!push || !kde) return "nepodporovano";

  let { receive } = await push.checkPermissions();
  if (receive !== "granted" && receive !== "denied" && volby.vyzadat) {
    ({ receive } = await push.requestPermissions());
  }
  if (receive === "denied") return "zamitnuto";
  if (receive !== "granted") return "vypnuto";

  if (!posluchaci) {
    posluchaci = true;
    await push.addListener("registration", ((t: { value: string }) => {
      void fetch("/api/push/nativni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforma: kde, token: t.value }),
      }).catch(() => undefined);
    }) as (d: never) => void);
    // Klepnutí na notifikaci: otevřít stránku, ke které patří.
    await push.addListener("pushNotificationActionPerformed", ((a: {
      notification: { data?: { odkaz?: unknown } };
    }) => {
      const odkaz = a.notification.data?.odkaz;
      if (typeof odkaz === "string" && odkaz.startsWith("/") && !odkaz.startsWith("//")) {
        window.location.assign(odkaz);
      }
    }) as (d: never) => void);
  }
  await push.register();
  return "zapnuto";
}
