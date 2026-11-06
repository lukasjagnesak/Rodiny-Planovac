-- ═══════════════════════════════════════════════════════════════════
--  Opakované výdaje
--
--  Výživné, obědy ve škole, kroužky, pojištění, spoření — u střídavé
--  péče je většina peněz pravidelná. Zadávat je každý měsíc znovu
--  znamená, že to po pár měsících nikdo nedělá a vyrovnání přestane
--  sedět.
--
--  Šablona sama o sobě není výdaj. Z ní se generují obyčejné výdaje,
--  aby zbytek aplikace — vyrovnání, grafy, účtenky — nemusel vědět,
--  že něco takového existuje.
-- ═══════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (select 1 from pg_type where typname = 'frekvence_vydaje') then
    create type frekvence_vydaje as enum ('tydne', 'mesicne', 'ctvrtletne', 'rocne');
  end if;
end $$;

create table if not exists vydaje_opakovane (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families (id) on delete cascade,
  child_id      uuid references children (id) on delete cascade,
  category      expense_category not null default 'other',
  title         text not null,
  amount        numeric(12, 2) not null check (amount >= 0),
  currency      text not null default 'CZK',
  paid_by       uuid references profiles (id) on delete set null,
  split_percent numeric(5, 2) not null default 50 check (split_percent between 0 and 100),

  frekvence     frekvence_vydaje not null default 'mesicne',
  -- Datum prvního výdaje. Zároveň kotva pro všechny další: měsíční
  -- opakování od 31. ledna padne na 28. února a v březnu je zase 31.,
  -- protože se počítá od kotvy, ne od minule vytvořeného.
  zacina        date not null default current_date,
  -- NULL = dokud to někdo nevypne.
  konci         date,
  aktivni       boolean not null default true,

  note          text,
  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists vydaje_opakovane_family_idx
  on vydaje_opakovane (family_id) where aktivni;

-- Vazba vygenerovaného výdaje na šablonu.
alter table expenses
  add column if not exists opakovani_id uuid references vydaje_opakovane (id) on delete set null;

-- Klíčová pojistka: cron běží každou hodinu a generování se tedy pustí
-- na tentýž den mnohokrát. Unikátní index z toho dělá bezpečnou operaci
-- — druhý pokus prostě neprojde a nikomu nevzniknou dva stejné výdaje.
create unique index if not exists expenses_opakovani_termin_unikat
  on expenses (opakovani_id, spent_on) where opakovani_id is not null;

alter table vydaje_opakovane enable row level security;

drop policy if exists vydaje_opakovane_select on vydaje_opakovane;
create policy vydaje_opakovane_select on vydaje_opakovane
  for select using (is_family_member(family_id));

-- Zápis přes `can_edit_family` schválně: opakovaný výdaj je zápis,
-- takže po vypršení předplatného nejde založit ani změnit.
drop policy if exists vydaje_opakovane_write on vydaje_opakovane;
create policy vydaje_opakovane_write on vydaje_opakovane
  for all using (can_edit_family(family_id)) with check (can_edit_family(family_id));

comment on table vydaje_opakovane is
  'Šablona pravidelného výdaje. Samotné výdaje se z ní generují do tabulky expenses.';
