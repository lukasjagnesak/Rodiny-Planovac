"use client";

/**
 * Klientská strana Web Push — registrace service workeru, přihlášení
 * k odběru u prohlížeče a uložení výsledku na server.
 *
 * Bez HTTPS (nebo `localhost`) prohlížeč Push API vůbec nenabízí,
 * takže `jePodporovan()` míří spíš na to, aby appka na starém iOS
 * Safari nebo v needitelné WebView nezobrazovala tlačítko, které
 * nemůže nikdy fungovat.
 */

export function jePodporovan(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export async function aktualniOdber(): Promise<PushSubscription | null> {
  if (!jePodporovan()) return null;
  const registrace = await navigator.serviceWorker.getRegistration("/");
  if (!registrace) return null;
  return registrace.pushManager.getSubscription();
}

/** Požádá o povolení a přihlásí tohle zařízení k odběru. */
export async function zapniNotifikace(verejnyKlic: string): Promise<PushSubscription> {
  const povoleno = await Notification.requestPermission();
  if (povoleno !== "granted") throw new Error("Notifikace jsi u prohlížeče nepovolil.");

  const registrace = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const odber = await registrace.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(verejnyKlic),
  });

  const odpoved = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(odber.toJSON()),
  });
  if (!odpoved.ok) throw new Error("Uložení na server selhalo.");

  return odber;
}

export async function vypniNotifikace(odber: PushSubscription): Promise<void> {
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: odber.endpoint }),
  });
  await odber.unsubscribe();
}
