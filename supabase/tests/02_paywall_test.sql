\set ON_ERROR_STOP on
\pset pager off

-- ═══════════════════════════════════════════════════════════════════
--  Paywall v RLS
--
--  Aplikace píše do Supabase přímo z prohlížeče, takže tohle je jediné
--  místo, kde paywall opravdu platí. Chyba na obě strany je drahá:
--  buď píše ten, kdo nezaplatil, nebo je zamčená platící rodina.
-- ═══════════════════════════════════════════════════════════════════

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select id as f from families limit 1 \gset
select id as d from children limit 1 \gset

\echo '--- P1) nová rodina má rovnou zkušební období na 30 dní'
select
  stav,
  round(extract(epoch from (plati_do - now())) / 86400)::int as dni
from predplatna where family_id = :'f';

\echo '--- P2) ve zkušebním období se píše'
insert into expenses (family_id, child_id, category, title, amount)
values (:'f', :'d', 'other', 'Během zkušebního období', 100);
select count(*) as vydaju_po_zapisu from expenses where title = 'Během zkušebního období';

-- ── Zkušební období doběhlo (mění jen servisní klíč) ──────────────
reset role;
reset request.jwt.claim.sub;
update predplatna set stav = 'vyprsel', plati_do = now() - interval '1 day'
where family_id = :'f';

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

\echo '--- P3) po vypršení zápis neprojde'
do $$
begin
  insert into expenses (family_id, child_id, category, title, amount)
  values ((select id from families limit 1), null, 'other', 'Po vypršení', 1);
  raise exception 'CHYBA: zápis prošel i po vypršení předplatného';
exception
  when insufficient_privilege then raise notice 'OK: zápis zamčen';
end $$;

\echo '--- P4) ani úprava a smazání toho, co už tam je'
do $$
begin
  update expenses set amount = 1 where title = 'Během zkušebního období';
  if found then raise exception 'CHYBA: úprava prošla i po vypršení'; end if;
  raise notice 'OK: úprava neměla co změnit';
end $$;

do $$
begin
  delete from expenses where title = 'Během zkušebního období';
  if found then raise exception 'CHYBA: smazání prošlo i po vypršení'; end if;
  raise notice 'OK: smazání nemělo co smazat';
end $$;

\echo '--- P5) čtení zůstává — kalendář, děti i výdaje jsou vidět'
select
  (select count(*) from children) as deti,
  (select count(*) from expenses) as vydaje,
  (select count(*) from custody_patterns) as vzory,
  (select count(*) from dokumenty) as dokumenty;

\echo '--- P6) pozvat druhého rodiče jde i po vypršení (je to důvod, proč lidé platí)'
insert into family_invites (family_id, email, role, token, custody_side, expires_at)
values (:'f', 'druhy@example.cz', 'parent', 'paywall-token', 'b', now() + interval '7 days');
select count(*) as pozvanek from family_invites where token = 'paywall-token';

-- ── Platba neprošla, Stripe to ještě zkouší ───────────────────────
reset role;
reset request.jwt.claim.sub;
update predplatna set stav = 'po_splatnosti' where family_id = :'f';

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

\echo '--- P7) po splatnosti se pořád píše (většina těch karet jen expirovala)'
insert into expenses (family_id, child_id, category, title, amount)
values (:'f', :'d', 'other', 'Po splatnosti', 100);
select count(*) as prosel from expenses where title = 'Po splatnosti';

-- ── Zaplaceno ─────────────────────────────────────────────────────
reset role;
reset request.jwt.claim.sub;
update predplatna set stav = 'aktivni', plati_do = now() + interval '30 days'
where family_id = :'f';

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

\echo '--- P8) zaplacená rodina píše bez omezení'
insert into expenses (family_id, child_id, category, title, amount)
values (:'f', :'d', 'other', 'Zaplaceno', 100);
select count(*) as prosel from expenses where title = 'Zaplaceno';

\echo '--- P9) rodina si předplatné nepřepíše sama'
do $$
begin
  update predplatna set plati_do = now() + interval '99 years';
  if found then raise exception 'CHYBA: rodina si prodloužila předplatné sama'; end if;
  raise notice 'OK: zápis do predplatna je jen pro servisní klíč';
end $$;

-- ── Rodina bez záznamu (starší než tabulka) ───────────────────────
reset role;
reset request.jwt.claim.sub;
delete from predplatna where family_id = :'f';

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

\echo '--- P10) rodina bez záznamu se nezamyká'
insert into expenses (family_id, child_id, category, title, amount)
values (:'f', :'d', 'other', 'Bez záznamu', 100);
select count(*) as prosel from expenses where title = 'Bez záznamu';

reset role;
reset request.jwt.claim.sub;

\echo '=== PAYWALL PROŠEL ==='
