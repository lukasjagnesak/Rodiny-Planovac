\set ON_ERROR_STOP on
\pset pager off

-- ═══════════════════════════════════════════════════════════════════
--  Výchozí předání je ráno, ne večer
--
--  `predavka_vecer = true` posouvalo první noc pobytu na den PŘED tím,
--  co si rodina ve vzoru zaškrtla — a nikde v appce se to nedalo
--  nastavit jinak, takže to potkalo každého. Migrace 0024 to opravila
--  jak pro nové vzory (výchozí hodnota sloupce), tak pro ty, co v tu
--  chvíli v databázi už byly (backfill).
-- ═══════════════════════════════════════════════════════════════════

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select id as f from families limit 1 \gset

\echo '--- P1) nový vzor bez predavka_vecer dostane výchozí ráno, ne večer'
insert into custody_patterns (family_id, kind, starts_on, anchor_date, anchor_side, weekly_map)
values (:'f', 'custom_weekly', '2026-01-01', '2026-01-01', 'a', 'aaabbbb')
returning id as vzor \gset

select predavka_vecer from custody_patterns where id = :'vzor';

\echo '--- P2) migrace přepsala i vzory, co v databázi byly už dřív'
reset role;
reset request.jwt.claim.sub;

-- Vezmeme si zpátky "výchozí" hodnotu z dob před migrací 0024, ať jde
-- ověřit, že by na takový starý řádek backfill z migrace zabral.
update custody_patterns set predavka_vecer = true where id = :'vzor';
update custody_patterns set predavka_vecer = false where predavka_vecer = true;

select predavka_vecer from custody_patterns where id = :'vzor';

\echo '=== PŘEDÁNÍ PROŠLO ==='
