/**
 * Service worker: push notifikace a hláška, když vypadne signál.
 *
 * Data se schválně necachují. Kalendář péče, u kterého by se ukázal
 * včerejší stav, je horší než žádný — rodič by podle něj jel pro dítě
 * ve špatný den. Proto tudy všechny požadavky procházejí rovnou na síť.
 *
 * Přesto tu `fetch` je, a to ze dvou důvodů. Chrome bez něj nenabídne
 * přidání na plochu: kontrola instalovatelnosti vyžaduje service worker
 * s neprázdným `fetch` obsluhovačem. A druhý důvod je poctivější —
 * když je člověk v garážích bez signálu, dostane místo dinosaura
 * stránku, která řekne, co se děje.
 */

/* Verze se mění při každé úpravě tohoto souboru — jinak si prohlížeč
   nechá starou mezipaměť i s neplatnou offline stránkou. */
const VERZE = "klidoo-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERZE)
      .then((mezipamet) => mezipamet.addAll([OFFLINE, "/icons/icon-192.png"]))
      // Nová verze nastupuje hned. U service workeru, který nic
      // necachuje, není co dohrávat, a čekat na zavření všech karet by
      // znamenalo, že oprava dorazí za týden.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((klice) => Promise.all(klice.filter((k) => k !== VERZE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Jen otevírání stránek. Data, obrázky ani volání API sem nepatří —
  // ta ať selžou tak, jak selhat mají, a aplikace si to ošetří sama.
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE)),
  );
});

self.addEventListener("push", (event) => {
  let data = { titulek: "Klidoo", telo: "", odkaz: "/prehled" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Zpráva bez těla (test od prohlížeče) — zůstane výchozí text.
  }

  event.waitUntil(
    self.registration.showNotification(data.titulek, {
      body: data.telo,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      data: { odkaz: data.odkaz },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const odkaz = event.notification.data?.odkaz || "/prehled";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if (new URL(client.url).pathname === odkaz && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(odkaz);
    })(),
  );
});
