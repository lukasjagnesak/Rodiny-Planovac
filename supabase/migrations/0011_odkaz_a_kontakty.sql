-- ═══════════════════════════════════════════════════════════════════
--  Odkaz u položek ze školy a adresář kontaktů
-- ═══════════════════════════════════════════════════════════════════

-- U novinek je v textu jen titulek; adresa leží v datech události.
alter table edupage_items add column if not exists odkaz text;

-- ── Kontakty ──────────────────────────────────────────────────────
--  Třídní učitel, pediatr, zubař, kroužek. Když se dítěti něco stane
--  a zrovna ho má druhý rodič, musí být číslo po ruce oběma.
do $$ begin
  create type kontakt_druh as enum
    ('skola', 'lekar', 'krouzek', 'rodina', 'jine');
exception when duplicate_object then null; end $$;

create table if not exists kontakty (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families (id) on delete cascade,
  -- Kontakt může patřit konkrétnímu dítěti (třídní učitelka), nebo celé
  -- rodině (pediatr pro obě děti) — proto nepovinné.
  child_id      uuid references children (id) on delete cascade,
  druh          kontakt_druh not null default 'jine',
  jmeno         text not null,
  role          text,
  organizace    text,
  telefon       text,
  email         text,
  adresa        text,
  -- Ordinační či konzultační hodiny. Volný text schválně: každá ordinace
  -- je píše jinak a strukturovat to znamená bránit se zapsat pravdu.
  hodiny        text,
  poznamka      text,
  web           text,
  poradi        smallint not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists kontakty_family_idx on kontakty (family_id, druh, poradi);

alter table kontakty enable row level security;

drop policy if exists kontakty_select on kontakty;
create policy kontakty_select on kontakty
  for select using (is_family_member(family_id));

drop policy if exists kontakty_write on kontakty;
create policy kontakty_write on kontakty
  for all using (can_edit_family(family_id)) with check (can_edit_family(family_id));
