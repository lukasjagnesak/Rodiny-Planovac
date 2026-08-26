\set ON_ERROR_STOP on
\pset pager off

-- Supabase dává tyto granty automaticky; ve stubu je musíme doplnit.
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant all on all tables in schema storage to authenticated;

-- Tři uživatelé: dva rodiče a jeden cizí člověk.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'tata@example.cz'),
  ('22222222-2222-2222-2222-222222222222', 'mama@example.cz'),
  ('99999999-9999-9999-9999-999999999999', 'cizi@example.cz');

\echo '--- 1) profily vznikly triggerem'
select count(*) as profily from profiles;

-- ══ TÁTA ══════════════════════════════════════════════════════════
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

\echo '--- 2) založení rodiny přes RPC'
select create_family('Novákovi', 'Táta', 'a') as family_id \gset
select :'family_id' as zalozena_rodina;

\echo '--- 3) vidím právě jednu rodinu'
select count(*) as moje_rodiny from families;

\echo '--- 4) přidání dítěte, vzoru, kroužku a výdaje'
insert into children (family_id, name, birth_date, color)
values (:'family_id', 'Kuba', '2016-04-12', '#7c5cd6')
returning id as child_id \gset

insert into custody_patterns (family_id, kind, starts_on, anchor_date, anchor_side)
values (:'family_id', 'alternating_weeks', '2026-01-05', '2026-01-05', 'a');

insert into activities (family_id, child_id, name, day_of_week, starts_at, ends_at, season_start)
values (:'family_id', :'child_id', 'Fotbal', 2, '16:00', '17:30', '2026-01-01')
returning id as activity_id \gset

insert into expenses (family_id, child_id, category, title, amount, paid_by)
values (:'family_id', :'child_id', 'clothing', 'Bunda', 1890,
        '11111111-1111-1111-1111-111111111111');

select
  (select count(*) from children) as deti,
  (select count(*) from activities) as krouzky,
  (select count(*) from expenses) as vydaje;

\echo '--- 5) upsert termínu kroužku (přiřazení řidiče) proběhne dvakrát bez duplicit'
insert into activity_occurrences (family_id, activity_id, day, driver_there)
values (:'family_id', :'activity_id', '2026-03-03', '11111111-1111-1111-1111-111111111111')
on conflict (activity_id, day) do update set driver_there = excluded.driver_there;

insert into activity_occurrences (family_id, activity_id, day, driver_there)
values (:'family_id', :'activity_id', '2026-03-03', '22222222-2222-2222-2222-222222222222')
on conflict (activity_id, day) do update set driver_there = excluded.driver_there;

select count(*) as terminu, max(driver_there::text) as posledni_ridic from activity_occurrences;

\echo '--- 6) výjimka péče pro celou rodinu (child_id IS NULL) se nezduplikuje'
insert into custody_overrides (family_id, child_id, day, side)
values (:'family_id', null, '2026-03-10', 'b');
select count(*) as vyjimky from custody_overrides;

\echo '--- 7) druhý pokus o stejný den musí selhat na unikátním indexu'
do $$
begin
  insert into custody_overrides (family_id, child_id, day, side)
  values ((select id from families limit 1), null, '2026-03-10', 'a');
  raise exception 'CHYBA: duplicitní výjimka prošla';
exception when unique_violation then
  raise notice 'OK: duplicitní výjimka odmítnuta';
end $$;

\echo '--- 8) pozvánka pro mámu'
insert into family_invites (family_id, email, role, custody_side, invited_by)
values (:'family_id', 'mama@example.cz', 'parent', 'b',
        '11111111-1111-1111-1111-111111111111')
returning token as invite_token \gset

-- ══ MÁMA ══════════════════════════════════════════════════════════
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

\echo '--- 9) před přijetím pozvánky nevidí nic'
select
  (select count(*) from families) as rodiny,
  (select count(*) from children) as deti,
  (select count(*) from expenses) as vydaje;

\echo '--- 10) přijetí pozvánky'
select accept_invite(:'invite_token') as pripojena_rodina;

\echo '--- 11) po přijetí vidí rodinná data'
select
  (select count(*) from families) as rodiny,
  (select count(*) from children) as deti,
  (select count(*) from expenses) as vydaje,
  (select count(*) from profiles) as viditelne_profily;

\echo '--- 12) máma smí zapisovat (role parent)'
insert into events (family_id, child_id, kind, title, starts_at, created_by)
values (:'family_id', :'child_id', 'medical', 'Zubař', now() + interval '3 days',
        '22222222-2222-2222-2222-222222222222');
select count(*) as udalosti from events;

-- psql do bloků $$…$$ proměnné nedosazuje, tak si je přeneseme přes nastavení.
select set_config('test.family', :'family_id', false),
       set_config('test.child', :'child_id', false);

\echo '--- 12b) rozvrh: hodina se nedá založit dvakrát na stejné místo'
insert into rozvrh_hodiny (family_id, child_id, den, poradi, predmet, zacatek, konec)
values (:'family_id', :'child_id', 1, 1, 'Matematika', '08:00', '08:45');

do $$
begin
  insert into rozvrh_hodiny (family_id, child_id, den, poradi, predmet, zacatek, konec)
  values (current_setting('test.family')::uuid, current_setting('test.child')::uuid,
          1, 1, 'Čeština', '08:00', '08:45');
  raise exception 'CHYBA: duplicitní hodina prošla';
exception
  when unique_violation then raise notice 'OK: druhá hodina na stejném místě odmítnuta';
end $$;

\echo '--- 12c) rozvrh: sudý a lichý týden vedle sebe projdou'
insert into rozvrh_hodiny (family_id, child_id, den, poradi, predmet, zacatek, konec, parita)
values (:'family_id', :'child_id', 1, 6, 'Dílny', '12:45', '13:30', 'sudy'),
       (:'family_id', :'child_id', 1, 6, 'Vaření', '12:45', '13:30', 'lichy');
select count(*) as hodin from rozvrh_hodiny;

\echo '--- 12d) rozvrh: konec před začátkem neprojde'
do $$
begin
  insert into rozvrh_hodiny (family_id, child_id, den, poradi, predmet, zacatek, konec)
  values (current_setting('test.family')::uuid, current_setting('test.child')::uuid,
          2, 1, 'Nesmysl', '10:00', '09:00');
  raise exception 'CHYBA: obrácené časy prošly';
exception
  when check_violation then raise notice 'OK: obrácené časy odmítnuty';
end $$;

\echo '--- 12e) změna v rozvrhu platí na jeden den a jen jednou'
insert into rozvrh_zmeny (family_id, child_id, den, poradi, druh, predmet)
values (:'family_id', :'child_id', '2026-03-03', 5, 'zruseno', 'Tělocvik');

do $$
begin
  insert into rozvrh_zmeny (family_id, child_id, den, poradi, druh)
  values (current_setting('test.family')::uuid, current_setting('test.child')::uuid,
          '2026-03-03', 5, 'zmena');
  raise exception 'CHYBA: druhá změna na stejné místo prošla';
exception
  when unique_violation then raise notice 'OK: druhá změna na stejné místo odmítnuta';
end $$;

do $$
begin
  insert into rozvrh_zmeny (family_id, child_id, den, poradi, druh)
  values (current_setting('test.family')::uuid, current_setting('test.child')::uuid,
          '2026-03-04', 5, 'nesmysl');
  raise exception 'CHYBA: neznámý druh změny prošel';
exception
  when check_violation then raise notice 'OK: neznámý druh změny odmítnut';
end $$;

\echo '--- 12e2) párování dítěte v EduPage patří jen svému uživateli'
insert into edupage_deti (user_id, edupage_id, child_id, jmeno)
values ('22222222-2222-2222-2222-222222222222', 4521, :'child_id', 'Kuba');
select count(*) as moje_parovani from edupage_deti;

do $$
begin
  insert into edupage_deti (user_id, edupage_id)
  values ('11111111-1111-1111-1111-111111111111', 999);
  raise exception 'CHYBA: párování cizímu uživateli prošlo';
exception
  when insufficient_privilege then raise notice 'OK: párování cizímu uživateli odmítnuto';
end $$;

\echo '--- 12f) položky ze školy zapisuje jen stahování, ne člen rodiny'
do $$
begin
  insert into edupage_items (family_id, child_id, external_id, druh, text)
  values (current_setting('test.family')::uuid, current_setting('test.child')::uuid,
          '77:1234', 'zprava', 'Podvrh');
  raise exception 'CHYBA: ruční zápis položky prošel';
exception
  when insufficient_privilege then raise notice 'OK: ruční zápis odmítnut (píše jen stahování)';
end $$;

\echo '--- 13) máma NESMÍ přejmenovat rodinu (není owner)'
update families set name = 'Ukradeno';
select name as nazev_rodiny_zustal from families;

-- ══ CIZÍ ČLOVĚK ═══════════════════════════════════════════════════
set request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999';

\echo '--- 14) cizí uživatel nevidí NIC'
select
  (select count(*) from families) as rodiny,
  (select count(*) from children) as deti,
  (select count(*) from expenses) as vydaje,
  (select count(*) from activities) as krouzky,
  (select count(*) from events) as udalosti,
  (select count(*) from custody_patterns) as vzory,
  (select count(*) from rozvrh_hodiny) as hodin_rozvrhu,
  (select count(*) from rozvrh_zmeny) as zmen_rozvrhu,
  (select count(*) from edupage_items) as ze_skoly,
  (select count(*) from edupage_deti) as parovani;

\echo '--- 15) cizí uživatel nemůže vložit výdaj do cizí rodiny'
do $$
begin
  insert into expenses (family_id, category, title, amount)
  values ('00000000-0000-0000-0000-000000000000', 'other', 'Podvrh', 1);
  raise exception 'CHYBA: cizí zápis prošel';
exception
  when insufficient_privilege then raise notice 'OK: zápis odmítnut RLS politikou';
  when foreign_key_violation then raise notice 'OK: zápis odmítnut (neexistující rodina)';
end $$;

\echo '--- 16) cizí uživatel vidí jen svůj profil'
select count(*) as viditelne_profily from profiles;

-- ══ Zápisy servisním klíčem (stahování z EduPage) ═════════════════
reset role;
reset request.jwt.claim.sub;

\echo '--- 16b) zpráva z EduPage je platný druh položky'
insert into edupage_items (family_id, child_id, external_id, druh, text)
values (:'family_id', :'child_id', '77:1234', 'zprava', 'Zítra jdeme do divadla');
select druh, child_id is not null as ma_dite from edupage_items;

\echo '--- 16c) neznámý druh položky neprojde ani servisnímu klíči'
do $$
begin
  insert into edupage_items (family_id, external_id, druh, text)
  values (current_setting('test.family')::uuid, 'x:1', 'vymysl', '');
  raise exception 'CHYBA: neznámý druh položky prošel';
exception
  when check_violation then raise notice 'OK: neznámý druh položky odmítnut';
end $$;

\echo '--- 16d) stejná položka dvakrát se nezaloží dvakrát'
insert into edupage_items (family_id, child_id, external_id, druh, text)
values (:'family_id', :'child_id', '77:1234', 'zprava', 'Upravený text')
on conflict (family_id, external_id) do update set text = excluded.text;
select count(*) as polozek, max(text) as text from edupage_items;


\echo '--- 17) upsert notifikace s dedupe klíčem (dvakrát → jeden řádek)'
insert into notifications (family_id, user_id, title, body, dedupe_key)
values (:'family_id', '11111111-1111-1111-1111-111111111111', 'Test', 'Telo', 'ride:1:2026-03-03')
on conflict (user_id, dedupe_key) do nothing;

insert into notifications (family_id, user_id, title, body, dedupe_key)
values (:'family_id', '11111111-1111-1111-1111-111111111111', 'Test', 'Telo', 'ride:1:2026-03-03')
on conflict (user_id, dedupe_key) do nothing;

select count(*) as notifikaci from notifications;

\echo '--- 18) storage politika umí přečíst family_id z cesty'
select storage.foldername('33333333-3333-3333-3333-333333333333/abc/uctenka.jpg') as slozky;

\echo '=== VŠE PROŠLO ==='
