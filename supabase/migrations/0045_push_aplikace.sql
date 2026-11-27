-- ═══════════════════════════════════════════════════════════════════
--  Push notifikace z aplikací z App Store a Google Play
--
--  Tokeny zařízení se ukládají do stejné tabulky jako odběry Web Push:
--  `endpoint` = 'apns:<token>' (iPhone) nebo 'fcm:<token>' (Android),
--  `p256dh` a `auth` zůstávají prázdné. Všechna místa, která posílají
--  notifikace, tak fungují beze změny (rozcestník je v lib/push.ts).
--
--  Jen přidání sloupce, nic se nemaže ani nepřepisuje.
-- ═══════════════════════════════════════════════════════════════════

alter table push_subscriptions
  add column if not exists druh text not null default 'web';

alter table push_subscriptions drop constraint if exists push_subscriptions_druh_check;
alter table push_subscriptions
  add constraint push_subscriptions_druh_check check (druh in ('web', 'apns', 'fcm'));

-- Druh musí sedět s předponou v endpointu, jinak by se zpráva poslala
-- špatným kanálem.
alter table push_subscriptions drop constraint if exists push_subscriptions_druh_endpoint;
alter table push_subscriptions
  add constraint push_subscriptions_druh_endpoint check (
    (druh = 'web' and endpoint like 'https://%')
    or (druh = 'apns' and endpoint like 'apns:%')
    or (druh = 'fcm' and endpoint like 'fcm:%')
  );
