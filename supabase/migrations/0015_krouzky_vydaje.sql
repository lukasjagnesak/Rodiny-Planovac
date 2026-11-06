-- ═══════════════════════════════════════════════════════════════════
--  Kroužky se dělí mezi rodiče stejně jako běžný výdaj
--
--  Cena kroužku byla u aktivity jen jako informace — nikam se nepočítala
--  a v přehledu výdajů chyběla, přestože je to jedna z největších
--  pravidelných položek. Vazba `expenses.activity_id` přitom existuje
--  od začátku; chybělo, kde si u kroužku uložit, kdo platí a jakým dílem.
--
--  Samotná platba zůstává obyčejným výdajem. Tyhle sloupce jsou jen
--  výchozí hodnoty, aby se nemusely vyplňovat u každé platby znovu.
-- ═══════════════════════════════════════════════════════════════════

alter table activities
  add column if not exists paid_by uuid references profiles (id) on delete set null;

alter table activities
  add column if not exists split_percent numeric(5, 2) not null default 50;

-- Podmínku přidáváme zvlášť, ať se migrace dá pustit i podruhé.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'activities_split_percent_range'
  ) then
    alter table activities
      add constraint activities_split_percent_range
      check (split_percent between 0 and 100);
  end if;
end $$;

-- Platby ke kroužku se dohledávají přes vazbu na aktivitu.
create index if not exists expenses_activity_idx
  on expenses (activity_id) where activity_id is not null;

comment on column activities.split_percent is
  'Jaký podíl z ceny nese druhý rodič (0–100). Výchozí hodnota pro platby.';
