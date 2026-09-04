-- ═══════════════════════════════════════════════════════════════════
--  Víc dětí pod jedním účtem EduPage, zprávy a denní změny rozvrhu
--
--  Rodič se do EduPage hlásí jednou, ale dětí tam vidí víc. Dřív se dalo
--  uložit jedno ID dítěte, což na dvě děti nestačí — a hlavně se pak
--  nedalo poznat, komu který úkol patří. Proto párovací tabulka.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists edupage_deti (
  id          uuid primary key default gen_random_uuid(),
  -- Ke kterému propojenému účtu párování patří.
  user_id     uuid not null references profiles (id) on delete cascade,
  -- ID dítěte v EduPage.
  edupage_id  integer not null,
  -- Které dítě v plánovači to je. Bez něj se dítě nestahuje.
  child_id    uuid references children (id) on delete cascade,
  jmeno       text,
  created_at  timestamptz not null default now(),
  unique (user_id, edupage_id)
);

alter table edupage_deti enable row level security;

drop policy if exists edupage_deti_own on edupage_deti;
create policy edupage_deti_own on edupage_deti
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Jedno ID dítěte u účtu už nedává smysl, párování je vedle.
alter table edupage_accounts drop column if exists dite_id;
alter table edupage_accounts drop column if exists rozvrh_child_id;

-- ── Zprávy ────────────────────────────────────────────────────────
--  Druh přestává být výčtový typ. Přidat hodnotu do enumu jde jen mimo
--  transakci, což se v SQL editoru špatně dodržuje — text s kontrolou
--  dělá totéž a rozšíří se kdykoli.
do $$ begin
  alter table edupage_items alter column druh type text using druh::text;
exception when undefined_column or undefined_table then null; end $$;

alter table edupage_items drop constraint if exists edupage_items_druh_check;
alter table edupage_items add constraint edupage_items_druh_check
  check (druh in ('ukol', 'pisemka', 'zprava', 'akce'));

drop type if exists edupage_druh;

-- Komu položka patří, se teď pozná vždy — sloupec byl, ale nikdo ho neplnil.
create index if not exists edupage_items_child_idx
  on edupage_items (child_id, termin);

-- ── Denní změny v rozvrhu ─────────────────────────────────────────
--  Denní rozvrh z EduPage nese i to, co ten den odpadá. Stálý rozvrh
--  tím nepřepisujeme — změna platí na jeden konkrétní den.
create table if not exists rozvrh_zmeny (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families (id) on delete cascade,
  child_id    uuid not null references children (id) on delete cascade,
  den         date not null,
  poradi      smallint not null check (poradi between 0 and 12),
  druh        text not null check (druh in ('zruseno', 'navic', 'zmena')),
  predmet     text,
  ucebna      text,
  zacatek     time,
  konec       time,
  -- Co na tom místě mělo být podle stálého rozvrhu.
  puvodni     text,
  fetched_at  timestamptz not null default now(),
  unique (child_id, den, poradi)
);

create index if not exists rozvrh_zmeny_den_idx on rozvrh_zmeny (family_id, den);

alter table rozvrh_zmeny enable row level security;

drop policy if exists rozvrh_zmeny_select on rozvrh_zmeny;
create policy rozvrh_zmeny_select on rozvrh_zmeny
  for select using (is_family_member(family_id));

drop policy if exists rozvrh_zmeny_write on rozvrh_zmeny;
create policy rozvrh_zmeny_write on rozvrh_zmeny
  for all using (can_edit_family(family_id)) with check (can_edit_family(family_id));
