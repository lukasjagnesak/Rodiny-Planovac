-- ═══════════════════════════════════════════════════════════════════
--  Rozvrh hodin
--
--  Jedna hodina = jeden řádek. Časy se drží u hodiny, protože zvonění
--  se mezi školami i mezi stupni liší a nedá se odvodit z pořadí.
--
--  Sloupec `parita` řeší školy, kde se rozvrh liší v sudém a lichém
--  týdnu. Ve výchozím stavu je `vzdy`, tedy stejně každý týden.
-- ═══════════════════════════════════════════════════════════════════

do $$ begin
  create type rozvrh_parita as enum ('vzdy', 'sudy', 'lichy');
exception when duplicate_object then null; end $$;

create table if not exists rozvrh_hodiny (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families (id) on delete cascade,
  child_id    uuid not null references children (id) on delete cascade,
  -- 1 = pondělí … 7 = neděle (stejně jako ISO)
  den         smallint not null check (den between 1 and 7),
  -- 0 = nultá hodina
  poradi      smallint not null check (poradi between 0 and 12),
  predmet     text not null,
  ucebna      text,
  ucitel      text,
  zacatek     time not null,
  konec       time not null,
  parita      rozvrh_parita not null default 'vzdy',
  poznamka    text,
  -- Řádky stažené z EduPage se dají hromadně nahradit dalším stažením,
  -- ručně zapsané zůstanou.
  ze_edupage  boolean not null default false,
  created_at  timestamptz not null default now(),
  check (konec > zacatek),
  unique (child_id, den, poradi, parita)
);

create index if not exists rozvrh_hodiny_child_idx
  on rozvrh_hodiny (child_id, den, poradi);

alter table rozvrh_hodiny enable row level security;

drop policy if exists rozvrh_hodiny_select on rozvrh_hodiny;
create policy rozvrh_hodiny_select on rozvrh_hodiny
  for select using (is_family_member(family_id));

drop policy if exists rozvrh_hodiny_insert on rozvrh_hodiny;
create policy rozvrh_hodiny_insert on rozvrh_hodiny
  for insert with check (can_edit_family(family_id));

drop policy if exists rozvrh_hodiny_update on rozvrh_hodiny;
create policy rozvrh_hodiny_update on rozvrh_hodiny
  for update using (can_edit_family(family_id)) with check (can_edit_family(family_id));

drop policy if exists rozvrh_hodiny_delete on rozvrh_hodiny;
create policy rozvrh_hodiny_delete on rozvrh_hodiny
  for delete using (can_edit_family(family_id));

-- Ke kterému dítěti se stahuje rozvrh z EduPage. U rodičovského účtu
-- se dá přepnout na dítě, u žákovského je to ten přihlášený.
alter table edupage_accounts
  add column if not exists rozvrh_child_id uuid references children (id) on delete set null;
