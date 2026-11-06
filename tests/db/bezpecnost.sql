-- Scénář: bezpečnostní matice z master briefu (kap. 9.2).
-- Cizí rodina nevidí nic, odebraný člen ztratí přístup, člen jen ke
-- čtení nevidí doklady dětí a nic nezapíše. Pouští scripts/test-db.sh.
\set ON_ERROR_STOP 0
grant all on all tables in schema public to authenticated;
grant usage on schema storage to authenticated;
grant all on storage.objects to authenticated;
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000006a1','rodicA@x.cz','{"full_name":"Rodič A"}'),
 ('00000000-0000-0000-0000-0000000006a2','rodicA2@x.cz','{"full_name":"Druhý A"}'),
 ('00000000-0000-0000-0000-0000000006b1','rodicB@x.cz','{"full_name":"Rodič B"}'),
 ('00000000-0000-0000-0000-0000000006c1','ctenar@x.cz','{"full_name":"Čtenář"}');

-- Rodina A se vším, co je citlivé
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000006a1',false);
select create_family('Rodina A','Rodič A','a') as ra \gset
insert into children (family_id, name) values (:'ra', 'Dítě A') returning id as dite \gset
insert into expenses (family_id, title, amount, paid_by) values (:'ra', 'Zubař', 500, auth.uid()) returning id as vydaj \gset
insert into receipts (family_id, expense_id, storage_path) values (:'ra', :'vydaj', :'ra' || '/uctenka.jpg');
insert into dokumenty (family_id, child_id, druh, nazev, storage_path) values (:'ra', :'dite', 'jine', 'Rodný list', :'ra' || '/rl.pdf') returning id as dok \gset
insert into zpravy (family_id, autor, autor_jmeno, text) values (:'ra', auth.uid(), 'Rodič A', 'Soukromá zpráva');
insert into darky (family_id, nazev) values (:'ra', 'Kolo');
insert into storage.objects (bucket_id, name) values ('receipts', :'ra' || '/uctenka.jpg'), ('dokumenty', :'ra' || '/rl.pdf');
reset role;
insert into family_members (family_id, user_id, role, custody_side) values
  (:'ra', '00000000-0000-0000-0000-0000000006a2', 'parent', 'b'),
  (:'ra', '00000000-0000-0000-0000-0000000006c1', 'viewer', null);

-- 1) Rodič z rodiny B nevidí nic z rodiny A, ani přes známé ID
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000006b1',false);
select create_family('Rodina B','Rodič B','a') as rb \gset
select
  (select count(*) from families where id = :'ra') as rodina,
  (select count(*) from children where family_id = :'ra') as deti,
  (select count(*) from expenses where id = :'vydaj') as vydaj,
  (select count(*) from receipts where family_id = :'ra') as uctenky,
  (select count(*) from dokumenty where id = :'dok') as doklad,
  (select count(*) from zpravy where family_id = :'ra') as zpravy,
  (select count(*) from darky where family_id = :'ra') as darky,
  (select count(*) from historie where family_id = :'ra') as historie,
  (select count(*) from storage.objects where name like :'ra' || '/%') as soubory;
-- ani zápis do cizí rodiny
insert into expenses (family_id, title, amount) values (:'ra', 'Podvrh', 1);
update expenses set amount = 1 where id = :'vydaj';
select count(*) as zmeneno_cizi from expenses where id = :'vydaj' and amount = 1;

-- 2) Člen jen ke čtení: vidí kalendářová data a účtenky, ne doklady dětí, nic nezapíše
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000006c1',false);
select
  (select count(*) from expenses where family_id = :'ra') as vydaje,
  (select count(*) from receipts where family_id = :'ra') as uctenky,
  (select count(*) from dokumenty where family_id = :'ra') as doklady,
  (select count(*) from storage.objects where bucket_id = 'dokumenty' and name like :'ra' || '/%') as soubory_dokladu;
insert into expenses (family_id, title, amount) values (:'ra', 'Čtenář', 1);

-- 3) Odebraný člen: druhý rodič odejde, potom nevidí nic
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000006a2',false);
select count(*) as pred_odebranim from dokumenty where family_id = :'ra';
reset role;
delete from family_members where family_id = :'ra' and user_id = '00000000-0000-0000-0000-0000000006a2';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000006a2',false);
select
  (select count(*) from families where id = :'ra') as rodina,
  (select count(*) from dokumenty where family_id = :'ra') as doklady,
  (select count(*) from storage.objects where name like :'ra' || '/%') as soubory;
reset role;
