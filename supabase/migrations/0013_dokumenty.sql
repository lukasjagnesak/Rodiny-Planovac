-- ═══════════════════════════════════════════════════════════════════
--  Doklady dětí
--
--  Kartička pojištěnce, občanka, pas, očkovací průkaz. Smysl je jediný:
--  když je dítě u jednoho rodiče a stane se něco, druhý rodič nemusí
--  nic hledat ani nikam jezdit.
--
--  Proti účtenkám je tu jeden rozdíl: účtenku vidí každý člen rodiny
--  včetně role „jen pro čtení". Doklady ne — na ty smí jen ten, kdo
--  o dítě opravdu pečuje.
-- ═══════════════════════════════════════════════════════════════════

do $$ begin
  create type doklad_druh as enum
    ('pojistenec', 'obcanka', 'pas', 'ockovani', 'rodny_list', 'jine');
exception when duplicate_object then null; end $$;

create table if not exists dokumenty (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families (id) on delete cascade,
  child_id      uuid references children (id) on delete cascade,
  druh          doklad_druh not null default 'jine',
  nazev         text not null,
  storage_path  text not null,
  mime_type     text,
  size_bytes    integer,
  -- Průkazy mívají platnost. Hlídat ji je půlka důvodu, proč je tu mít.
  plati_do      date,
  poznamka      text,
  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists dokumenty_family_idx on dokumenty (family_id, child_id);

alter table dokumenty enable row level security;

-- Čtení i zápis jen pro pečující role — ne pro „jen pro čtení".
drop policy if exists dokumenty_select on dokumenty;
create policy dokumenty_select on dokumenty
  for select using (can_edit_family(family_id));

drop policy if exists dokumenty_write on dokumenty;
create policy dokumenty_write on dokumenty
  for all using (can_edit_family(family_id)) with check (can_edit_family(family_id));

-- ── Úložiště ──────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dokumenty', 'dokumenty', false, 15728640,  -- 15 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "dokumenty_read" on storage.objects;
create policy "dokumenty_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'dokumenty'
    and can_edit_family(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "dokumenty_write" on storage.objects;
create policy "dokumenty_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dokumenty'
    and can_edit_family(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "dokumenty_delete" on storage.objects;
create policy "dokumenty_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'dokumenty'
    and can_edit_family(((storage.foldername(name))[1])::uuid)
  );
