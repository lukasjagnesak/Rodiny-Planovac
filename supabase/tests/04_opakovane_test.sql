\set ON_ERROR_STOP on
\pset pager off

-- ═══════════════════════════════════════════════════════════════════
--  Opakované výdaje
--
--  Cron běží každou hodinu, takže generování se na tentýž den pustí
--  mnohokrát. Zdvojený výdaj je v aplikaci o penězích mezi rozvedenými
--  rodiči to nejhorší, co může vzniknout — proto to nehlídá aplikace,
--  ale unikátní index.
-- ═══════════════════════════════════════════════════════════════════

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select id as f from families limit 1 \gset
select id as d from children limit 1 \gset

\echo '--- O1) šablonu založí člen rodiny'
insert into vydaje_opakovane (family_id, child_id, category, title, amount, frekvence, zacina)
values (:'f', :'d', 'other', 'Obědy ve škole', 1200, 'mesicne', '2026-01-10')
returning id as sablona \gset

select count(*) as sablon from vydaje_opakovane where family_id = :'f';

\echo '--- O2) vygenerovaný výdaj drží vazbu na šablonu'
insert into expenses (family_id, child_id, category, title, amount, spent_on, opakovani_id)
values (:'f', :'d', 'other', 'Obědy ve škole', 1200, '2026-01-10', :'sablona');
select count(*) as vydaju from expenses where opakovani_id = :'sablona';

\echo '--- O3) druhý běh cronu tentýž termín nezaloží podruhé'
do $$
begin
  insert into expenses (family_id, child_id, category, title, amount, spent_on, opakovani_id)
  select family_id, child_id, category, title, amount, spent_on, opakovani_id
  from expenses where opakovani_id is not null limit 1;
  raise exception 'CHYBA: vznikl zdvojený výdaj';
exception
  when unique_violation then raise notice 'OK: zdvojení odmítl index';
end $$;

\echo '--- O4) další termín téže šablony projde'
insert into expenses (family_id, child_id, category, title, amount, spent_on, opakovani_id)
values (:'f', :'d', 'other', 'Obědy ve škole', 1200, '2026-02-10', :'sablona');
select count(*) as vydaju from expenses where opakovani_id = :'sablona';

\echo '--- O5) běžné výdaje bez šablony index neomezuje'
insert into expenses (family_id, category, title, amount, spent_on)
values (:'f', 'other', 'Nákup', 100, '2026-02-10');
insert into expenses (family_id, category, title, amount, spent_on)
values (:'f', 'other', 'Jiný nákup', 200, '2026-02-10');
select count(*) as bez_sablony from expenses where opakovani_id is null and spent_on = '2026-02-10';

\echo '--- O6) smazání šablony nesmaže, co už bylo zaplaceno'
delete from vydaje_opakovane where id = :'sablona';
select count(*) as zbyle_vydaje, bool_and(opakovani_id is null) as odpojene
from expenses where title = 'Obědy ve škole';

-- Šablona, která přežije do testu paywallu.
insert into vydaje_opakovane (family_id, category, title, amount, frekvence, zacina)
values (:'f', 'other', 'Výživné', 4500, 'mesicne', '2026-01-05');

-- ── Paywall ───────────────────────────────────────────────────────
reset role;
reset request.jwt.claim.sub;
-- Předchozí test záznam o předplatném smazal, tak ho vrátíme zpět.
insert into predplatna (family_id, stav, plati_do)
values (:'f', 'vyprsel', now() - interval '1 day')
on conflict (family_id) do update
  set stav = excluded.stav, plati_do = excluded.plati_do;

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

\echo '--- O7) po vypršení předplatného nejde založit nové opakování'
do $$
begin
  insert into vydaje_opakovane (family_id, category, title, amount, frekvence, zacina)
  values ((select id from families limit 1), 'other', 'Po vypršení', 100, 'mesicne', current_date);
  raise exception 'CHYBA: opakovaný výdaj prošel i po vypršení';
exception
  when insufficient_privilege then raise notice 'OK: zápis zamčen';
end $$;

\echo '--- O8) ale vidět na ně je pořád'
select count(*) as viditelnych from vydaje_opakovane;

reset role;
reset request.jwt.claim.sub;
update predplatna set stav = 'zkusebni', plati_do = now() + interval '20 days'
where family_id = :'f';

\echo '=== OPAKOVANÉ VÝDAJE PROŠLY ==='
