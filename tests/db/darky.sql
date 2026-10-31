-- Scénář: nápady na dárky (migrace 0038). Pouští scripts/test-db.sh.
-- Řádky s ERROR jsou v očekávaném výstupu schválně.
\set ON_ERROR_STOP 0
grant all on all tables in schema public to authenticated;
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000003a1','adam@x.cz','{"full_name":"Adam"}'),
 ('00000000-0000-0000-0000-0000000003b2','bara@x.cz','{"full_name":"Bára"}'),
 ('00000000-0000-0000-0000-0000000003c3','cizi3@x.cz','{"full_name":"Cizí"}');

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000003a1',false);
select create_family('Dvořákovi','Adam','a') as rodina \gset
insert into children (family_id, name) values (:'rodina', 'Ema') returning id as ema \gset
reset role;
insert into family_members (family_id, user_id, role, custody_side) values (:'rodina','00000000-0000-0000-0000-0000000003b2','parent','b');

set role authenticated;
-- Bára přidá nápad; pokus podvrhnout autora a zamluvení se přepíše
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000003b2',false);
insert into darky (family_id, child_id, nazev, cena, prilezitost, pridal, koupi)
values (:'rodina', :'ema', 'Lego Friends', 899, 'narozeniny', '00000000-0000-0000-0000-0000000003a1', '00000000-0000-0000-0000-0000000003a1')
returning id as d1 \gset
select pridal_jmeno, koupi from darky where id = :'d1';
-- Špatný odkaz neprojde
insert into darky (family_id, nazev, odkaz) values (:'rodina', 'Kniha', 'javascript:alert(1)');

-- Adam si dárek zamluví; Bára už ho zamluvit ani uvolnit nemůže
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000003a1',false);
update darky set koupi = auth.uid() where id = :'d1' returning koupi_jmeno;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000003b2',false);
update darky set koupi = auth.uid() where id = :'d1';
update darky set koupi = null where id = :'d1';
update darky set koupeno_at = now() where id = :'d1';
-- Zamluvený dárek Bára nesmaže (řádek nevidí k smazání)
delete from darky where id = :'d1';
select count(*) as stale_tam from darky where id = :'d1';
-- Upravit cenu smí
update darky set cena = 799 where id = :'d1' returning cena;

-- Adam koupí a přidá výdaj
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000003a1',false);
insert into expenses (family_id, title, amount, paid_by, child_id) values (:'rodina', 'Dárek: Lego Friends', 799, auth.uid(), :'ema') returning id as v \gset
update darky set koupeno_at = now(), expense_id = :'v' where id = :'d1' returning koupeno_at is not null as koupeno, expense_id is not null as s_vydajem;
-- Uvolnění vrátí i koupeno
update darky set koupi = null where id = :'d1' returning koupi, koupeno_at, expense_id;
update darky set koupi = auth.uid() where id = :'d1';
update darky set koupeno_at = now(), darovano = true where id = :'d1' returning darovano;

-- Cizí člověk nic nevidí ani nepřidá
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000003c3',false);
select count(*) as cizi_vidi from darky where family_id = :'rodina';
insert into darky (family_id, nazev) values (:'rodina', 'Cizí dárek');
reset role;
