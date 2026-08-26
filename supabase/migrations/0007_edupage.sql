-- ═══════════════════════════════════════════════════════════════════
--  EduPage
--
--  Přihlašovací údaje ke škole jsou osobní, proto se ukládají ke
--  konkrétnímu uživateli, ne ke sdílené rodině — nikdo nemusí svoje
--  školní heslo sdílet s bývalým partnerem. Stažené úkoly ale patří
--  celé rodině, aby je viděli oba rodiče.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists edupage_accounts (
  user_id       uuid primary key references profiles (id) on delete cascade,
  email         text not null,
  -- Heslo je zašifrované (AES-256-GCM, TOKEN_ENCRYPTION_KEY), stejně
  -- jako Google refresh tokeny.
  heslo_enc     text not null,
  subdomena     text,
  dite_id       integer,
  je_rodic      boolean not null default false,
  last_sync_at  timestamptz,
  last_sync_error text,
  created_at    timestamptz not null default now()
);

do $$ begin
  create type edupage_druh as enum ('ukol', 'pisemka', 'akce');
exception when duplicate_object then null; end $$;

create table if not exists edupage_items (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families (id) on delete cascade,
  child_id      uuid references children (id) on delete set null,
  -- ID události v EduPage; drží se kvůli tomu, aby se opakovaným
  -- stahováním netvořily duplicity.
  external_id   text not null,
  druh          edupage_druh not null,
  typ           text,
  text          text not null default '',
  predmet       text,
  termin        date,
  zadano        timestamptz,
  hotovo        boolean not null default false,
  autor         text,
  navrh_kalendare text,
  -- Nastaví se, až z položky někdo udělá událost v kalendáři.
  event_id      uuid references events (id) on delete set null,
  skryto        boolean not null default false,
  fetched_at    timestamptz not null default now(),
  unique (family_id, external_id)
);

create index if not exists edupage_items_family_idx
  on edupage_items (family_id, termin);

alter table edupage_accounts enable row level security;
alter table edupage_items    enable row level security;

drop policy if exists edupage_accounts_own on edupage_accounts;
create policy edupage_accounts_own on edupage_accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists edupage_items_select on edupage_items;
create policy edupage_items_select on edupage_items
  for select using (is_family_member(family_id));

drop policy if exists edupage_items_update on edupage_items;
create policy edupage_items_update on edupage_items
  for update using (can_edit_family(family_id)) with check (can_edit_family(family_id));

drop policy if exists edupage_items_delete on edupage_items;
create policy edupage_items_delete on edupage_items
  for delete using (can_edit_family(family_id));
