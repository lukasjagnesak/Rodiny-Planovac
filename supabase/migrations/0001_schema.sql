-- ═══════════════════════════════════════════════════════════════════
--  Rodinný plánovač — databázové schéma
--  Spusť v Supabase SQL editoru (nebo `supabase db push`).
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Číselníky ──────────────────────────────────────────────────────

do $$ begin
  create type member_role as enum ('owner', 'parent', 'guardian', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Jakou roli má člen vůči dítěti v kalendáři péče
  create type custody_side as enum ('a', 'b');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pattern_kind as enum ('alternating_weeks', 'week_2_2_3', 'custom_weekly', 'fixed_parent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_kind as enum (
    'school_trip',      -- škola v přírodě
    'parent_meeting',   -- třídní schůzky
    'photo_session',    -- focení
    'excursion',        -- výlet se školou
    'medical',          -- lékařská prohlídka
    'birthday',
    'holiday',          -- prázdniny / volno
    'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type expense_category as enum (
    'alimony',      -- výživné
    'activities',   -- kroužky
    'clothing',     -- oblečení
    'fun',          -- zábava
    'school',       -- škola a pomůcky
    'health',       -- zdraví a léky
    'food',
    'travel',
    'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type transport_leg as enum ('there', 'back', 'both');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_status as enum ('pending', 'sent', 'failed', 'cancelled');
exception when duplicate_object then null; end $$;

-- ── Rodina ─────────────────────────────────────────────────────────

create table if not exists families (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  currency     text not null default 'CZK',
  timezone     text not null default 'Europe/Prague',
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Profil uživatele (1:1 s auth.users). Uživatel může být ve více rodinách.
create table if not exists profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  full_name        text not null default '',
  email            text,
  avatar_url       text,
  phone            text,
  color            text not null default '#3f74e0',
  telegram_chat_id text,
  telegram_link_code text,
  locale           text not null default 'cs',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Členství v rodině
create table if not exists family_members (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families (id) on delete cascade,
  user_id       uuid not null references profiles (id) on delete cascade,
  role          member_role not null default 'parent',
  -- Na které straně kalendáře péče člen stojí (NULL = neúčastní se střídání)
  custody_side  custody_side,
  display_name  text,
  color         text,
  created_at    timestamptz not null default now(),
  unique (family_id, user_id)
);

create index if not exists family_members_user_idx on family_members (user_id);
create index if not exists family_members_family_idx on family_members (family_id);

-- Pozvánky (člen, který ještě nemá účet)
create table if not exists family_invites (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families (id) on delete cascade,
  email       text not null,
  role        member_role not null default 'parent',
  custody_side custody_side,
  token       text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by  uuid references profiles (id) on delete set null,
  accepted_at timestamptz,
  expires_at  timestamptz not null default (now() + interval '30 days'),
  created_at  timestamptz not null default now()
);

create index if not exists family_invites_email_idx on family_invites (lower(email));

-- ── Děti ───────────────────────────────────────────────────────────

create table if not exists children (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families (id) on delete cascade,
  name        text not null,
  birth_date  date,
  color       text not null default '#2f6f5e',
  avatar_url  text,
  school      text,
  class_name  text,
  notes       text,
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists children_family_idx on children (family_id);

-- ── Střídavá péče ──────────────────────────────────────────────────

-- Vzor střídání. Platí od `starts_on` (a případně do `ends_on`).
-- Pozdější vzor přebíjí dřívější.
create table if not exists custody_patterns (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references families (id) on delete cascade,
  child_id     uuid references children (id) on delete cascade, -- NULL = platí pro všechny děti
  kind         pattern_kind not null default 'alternating_weeks',
  starts_on    date not null,
  ends_on      date,
  -- Referenční den, od kterého se cyklus počítá
  anchor_date  date not null,
  -- Která strana má děti v prvním cyklu po anchor_date
  anchor_side  custody_side not null default 'a',
  -- Pro 'custom_weekly': 7 znaků 'a'/'b' od pondělí do neděle, např. 'aabbaab'
  weekly_map   text,
  -- Pro 'fixed_parent': strana, která má děti trvale
  fixed_side   custody_side,
  -- Den v týdnu, kdy dochází k předání (0=neděle … 6=sobota) — jen informativní
  handover_dow smallint not null default 5,
  handover_time time not null default '17:00',
  note         text,
  created_at   timestamptz not null default now(),
  constraint custody_patterns_weekly_map_len
    check (weekly_map is null or weekly_map ~ '^[ab]{7}$')
);

create index if not exists custody_patterns_family_idx on custody_patterns (family_id, starts_on);

-- Konkrétní výjimka pro jeden den (prázdniny, výměna, nemoc…)
create table if not exists custody_overrides (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families (id) on delete cascade,
  child_id    uuid references children (id) on delete cascade, -- NULL = všechny děti
  day         date not null,
  side        custody_side not null,
  reason      text,
  created_by  uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create unique index if not exists custody_overrides_unique
  on custody_overrides (family_id, day, coalesce(child_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ── Kroužky ────────────────────────────────────────────────────────

create table if not exists activities (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families (id) on delete cascade,
  child_id      uuid not null references children (id) on delete cascade,
  name          text not null,
  location      text,
  address       text,
  -- Den v týdnu 0=neděle … 6=sobota
  day_of_week   smallint not null check (day_of_week between 0 and 6),
  starts_at     time not null,
  ends_at       time not null,
  season_start  date not null,
  season_end    date,
  price         numeric(12, 2) default 0,
  price_period  text default 'season',   -- season | month | lesson
  contact       text,
  color         text not null default '#7c5cd6',
  notes         text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint activities_time_order check (ends_at > starts_at)
);

create index if not exists activities_family_idx on activities (family_id, active);
create index if not exists activities_child_idx on activities (child_id);

-- Konkrétní termín kroužku + kdo veze. Řádek vzniká, až když se
-- termín nějak odlišuje (přiřazený řidič, zrušeno, jiný čas).
create table if not exists activity_occurrences (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families (id) on delete cascade,
  activity_id   uuid not null references activities (id) on delete cascade,
  day           date not null,
  cancelled     boolean not null default false,
  starts_at     time,
  ends_at       time,
  driver_there  uuid references profiles (id) on delete set null,
  driver_back   uuid references profiles (id) on delete set null,
  note          text,
  created_at    timestamptz not null default now(),
  unique (activity_id, day)
);

create index if not exists activity_occurrences_day_idx on activity_occurrences (family_id, day);

-- ── Události (škola, zdraví, výlety) ───────────────────────────────

create table if not exists events (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references families (id) on delete cascade,
  child_id     uuid references children (id) on delete cascade, -- NULL = celá rodina
  kind         event_kind not null default 'other',
  title        text not null,
  location     text,
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  all_day      boolean not null default false,
  notes        text,
  -- Kdo dítě veze / kdo se účastní
  responsible  uuid references profiles (id) on delete set null,
  -- Připomínky v minutách před začátkem, např. {1440, 60}
  reminders    integer[] not null default '{1440}',
  created_by   uuid references profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint events_time_order check (ends_at is null or ends_at >= starts_at)
);

create index if not exists events_family_time_idx on events (family_id, starts_at);
create index if not exists events_child_idx on events (child_id);

-- ── Výdaje a účtenky ───────────────────────────────────────────────

create table if not exists expenses (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families (id) on delete cascade,
  child_id      uuid references children (id) on delete cascade, -- NULL = společné
  category      expense_category not null default 'other',
  title         text not null,
  amount        numeric(12, 2) not null check (amount >= 0),
  currency      text not null default 'CZK',
  spent_on      date not null default current_date,
  paid_by       uuid references profiles (id) on delete set null,
  -- Jaký podíl z částky nese druhý rodič (0–100). 50 = půl na půl.
  split_percent numeric(5, 2) not null default 50 check (split_percent between 0 and 100),
  -- Výdaj vypořádán / proplacen
  settled       boolean not null default false,
  activity_id   uuid references activities (id) on delete set null,
  event_id      uuid references events (id) on delete set null,
  note          text,
  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists expenses_family_date_idx on expenses (family_id, spent_on desc);
create index if not exists expenses_child_idx on expenses (child_id);
create index if not exists expenses_category_idx on expenses (family_id, category);

-- Fotky účtenek — soubor leží v Storage bucketu `receipts`
create table if not exists receipts (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references families (id) on delete cascade,
  expense_id   uuid not null references expenses (id) on delete cascade,
  storage_path text not null,
  mime_type    text,
  size_bytes   bigint,
  uploaded_by  uuid references profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists receipts_expense_idx on receipts (expense_id);

-- ── Google Calendar ────────────────────────────────────────────────

create table if not exists google_accounts (
  user_id        uuid primary key references profiles (id) on delete cascade,
  google_email   text,
  -- Refresh token je před uložením zašifrován (AES-256-GCM, TOKEN_ENCRYPTION_KEY)
  refresh_token  text not null,
  calendar_id    text not null default 'primary',
  sync_custody   boolean not null default true,
  sync_activities boolean not null default true,
  sync_events    boolean not null default true,
  last_sync_at   timestamptz,
  last_sync_error text,
  created_at     timestamptz not null default now()
);

-- Mapování naší entity na ID události v Google kalendáři daného uživatele
create table if not exists google_event_links (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles (id) on delete cascade,
  family_id        uuid not null references families (id) on delete cascade,
  source_type      text not null,   -- 'event' | 'activity_occurrence' | 'custody'
  source_key       text not null,   -- id entity, u custody 'child_id:YYYY-MM-DD'
  google_event_id  text not null,
  content_hash     text,
  updated_at       timestamptz not null default now(),
  unique (user_id, source_type, source_key)
);

-- ── Notifikace ─────────────────────────────────────────────────────

create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references families (id) on delete cascade,
  user_id      uuid not null references profiles (id) on delete cascade,
  channel      text not null default 'telegram',
  title        text not null,
  body         text not null,
  send_at      timestamptz not null default now(),
  status       notification_status not null default 'pending',
  error        text,
  -- Deduplikace: stejný klíč se nepošle dvakrát
  dedupe_key   text,
  sent_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- Index je záměrně úplný (bez WHERE): jen tak z něj umí Postgres odvodit
-- ON CONFLICT při upsertu. Více řádků s NULL dedupe_key se stejně nekříží,
-- protože NULL se v unikátním indexu nepovažují za shodné.
create unique index if not exists notifications_dedupe_idx
  on notifications (user_id, dedupe_key);
create index if not exists notifications_pending_idx
  on notifications (status, send_at) where status = 'pending';

-- ── Automatické profily při registraci ─────────────────────────────

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Aktualizace updated_at ─────────────────────────────────────────

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on profiles;
create trigger profiles_touch before update on profiles
  for each row execute function touch_updated_at();
