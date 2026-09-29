-- ═══════════════════════════════════════════════════════════════════
--  Telegram pryč, místo něj nativní push notifikace
--
--  Telegram fungoval jen pro toho, kdo si ho ochotný nainstalovat vedle
--  aplikace. Push chodí přímo do zařízení, na kterém je Klidoo
--  nainstalovaný jako appka — o nic víc se žádat nemusí.
--
--  Jedno zařízení = jeden řádek, protože stejný člověk se běžně
--  přihlašuje z telefonu i z počítače a čekáme, že bude chtít
--  upozornění na obou.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

drop policy if exists push_subscriptions_own on push_subscriptions;
create policy push_subscriptions_own on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Rozeslání smí i servisní klíč z cronu (dispatchNotifications), ten
-- RLS obchází — policy je tu jen pro klienta, který si zařízení
-- sám přidává a odebírá.

alter table profiles drop column if exists telegram_chat_id;
alter table profiles drop column if exists telegram_link_code;

alter table notifications alter column channel set default 'push';
update notifications set channel = 'push' where channel = 'telegram';
