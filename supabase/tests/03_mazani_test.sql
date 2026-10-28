\set ON_ERROR_STOP on
\pset pager off

-- ═══════════════════════════════════════════════════════════════════
--  Mazání rodiny a účtu
--
--  Zásady ochrany osobních údajů slibují, že si člověk smaže účet
--  i rodinu sám. Chyba je drahá na obě strany: buď po „smazání" zůstanou
--  osobní údaje ležet v databázi, nebo odchod jednoho rodiče smaže
--  kalendář i tomu druhému.
-- ═══════════════════════════════════════════════════════════════════

reset role;
reset request.jwt.claim.sub;

-- ── Rodina, ve které zůstává druhý rodič ──────────────────────────
insert into auth.users (id, email) values
  ('aaaa1111-1111-1111-1111-111111111111', 'odchazi@example.cz'),
  ('bbbb2222-2222-2222-2222-222222222222', 'zustava@example.cz');

set role authenticated;
set request.jwt.claim.sub = 'aaaa1111-1111-1111-1111-111111111111';
select create_family('Odcházející', 'Odcházející rodič', 'a') as spolecna \gset

reset role;
reset request.jwt.claim.sub;

insert into family_members (family_id, user_id, role, custody_side, display_name)
values (:'spolecna', 'bbbb2222-2222-2222-2222-222222222222', 'parent', 'b', 'Zůstávající');

insert into children (family_id, name) values (:'spolecna', 'Anička')
returning id as dite_spolecne \gset

insert into expenses (family_id, child_id, category, title, amount, paid_by)
values (:'spolecna', :'dite_spolecne', 'other', 'Kolo', 3000,
        'aaaa1111-1111-1111-1111-111111111111');

\echo '--- M1) smazání uživatele nesmí smazat rodinu, kde zůstávají ostatní'
delete from auth.users where id = 'aaaa1111-1111-1111-1111-111111111111';

select
  (select count(*) from families where id = :'spolecna') as rodina_zustala,
  (select count(*) from children where family_id = :'spolecna') as deti_zustaly,
  (select count(*) from family_members where family_id = :'spolecna') as clenu;

\echo '--- M2) výdaj po odejitém plátci zůstává, jen se odpojí'
select count(*) as vydaju, bool_and(paid_by is null) as bez_platce
from expenses where family_id = :'spolecna';

\echo '--- M3) profil odejitého uživatele je pryč'
select count(*) as profilu from profiles where id = 'aaaa1111-1111-1111-1111-111111111111';

-- ── Rodina, ve které nikdo nezbyl ─────────────────────────────────
set role authenticated;
set request.jwt.claim.sub = 'bbbb2222-2222-2222-2222-222222222222';
select create_family('Sám doma', 'Sám', 'a') as osamela \gset

insert into children (family_id, name) values (:'osamela', 'Péťa')
returning id as dite_osamele \gset
insert into expenses (family_id, child_id, category, title, amount)
values (:'osamela', :'dite_osamele', 'other', 'Boty', 900);
insert into custody_patterns (family_id, kind, starts_on, anchor_date, anchor_side)
values (:'osamela', 'alternating_weeks', '2026-01-05', '2026-01-05', 'a');
insert into family_invites (family_id, email, role, token, expires_at)
values (:'osamela', 'nikdo@example.cz', 'parent', 'mazani-token', now() + interval '7 days');
insert into dokumenty (family_id, nazev, druh, storage_path)
values (:'osamela', 'Rodný list', 'jine', 'x/y/z.pdf');

reset role;
reset request.jwt.claim.sub;
insert into notifications (family_id, user_id, title, body)
values (:'osamela', 'bbbb2222-2222-2222-2222-222222222222', 'Test', 'Telo');

\echo '--- M4) smazání rodiny vezme s sebou úplně všechno'
delete from families where id = :'osamela';

select
  (select count(*) from children where family_id = :'osamela') as deti,
  (select count(*) from expenses where family_id = :'osamela') as vydaje,
  (select count(*) from custody_patterns where family_id = :'osamela') as vzory,
  (select count(*) from family_invites where family_id = :'osamela') as pozvanky,
  (select count(*) from dokumenty where family_id = :'osamela') as dokumenty,
  (select count(*) from notifications where family_id = :'osamela') as oznameni,
  (select count(*) from predplatna where family_id = :'osamela') as predplatna,
  (select count(*) from family_members where family_id = :'osamela') as clenstvi;

\echo '--- M5) uživatel po smazání své rodiny existuje dál'
select count(*) as profilu from profiles where id = 'bbbb2222-2222-2222-2222-222222222222';

\echo '=== MAZÁNÍ PROŠLO ==='
