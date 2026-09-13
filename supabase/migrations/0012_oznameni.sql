-- ═══════════════════════════════════════════════════════════════════
--  Stav přečtení oznámení
--
--  Oznámení se nikam neukládají — skládají se při každém načtení
--  z toho, co už v databázi je (zprávy, události, úkoly, změny
--  rozvrhu, doprava). Duplikovat je do vlastní tabulky by znamenalo
--  udržovat dvě pravdy a řešit, co dělat při smazání originálu.
--
--  Držet je proto potřeba jen jedno: odkdy je uživatel viděl.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists oznameni_stav (
  user_id     uuid not null references profiles (id) on delete cascade,
  family_id   uuid not null references families (id) on delete cascade,
  -- Všechno starší už uživatel viděl.
  videno_do   timestamptz not null default now(),
  primary key (user_id, family_id)
);

alter table oznameni_stav enable row level security;

drop policy if exists oznameni_stav_own on oznameni_stav;
create policy oznameni_stav_own on oznameni_stav
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
