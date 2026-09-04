/**
 * Service worker jen pro push notifikace — žádné cachování, žádný offline
 * režim. Ty by měnily, jak appka běžně funguje, a o to nejde; jde jen
 * o to, aby zpráva došla i se zavřenou aplikací.
 */

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
