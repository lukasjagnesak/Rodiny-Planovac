-- Scénář: vyrovnání výdajů (migrace 0039). Pouští scripts/test-db.sh.
-- Řádky s ERROR jsou v očekávaném výstupu schválně.
\set ON_ERROR_STOP 0
grant all on all tables in schema public to authenticated;
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000004a1','vit@x.cz','{"full_name":"Vít"}'),
 ('00000000-0000-0000-0000-0000000004b2','zuzana@x.cz','{"full_name":"Zuzana"}');

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000004a1',false);
select create_family('Horákovi','Vít','a') as rodina \gset
-- Sám v rodině si vyrovnání vede celé sám
insert into expenses (family_id, title, amount, split_percent, paid_by, spent_on)
values (:'rodina', 'Před pozváním', 100, 50, null, current_date - 40) returning id as v0 \gset
update expenses set settled = true where id = :'v0' returning settled;
reset role;
insert into family_members (family_id, user_id, role, custody_side) values (:'rodina','00000000-0000-0000-0000-0000000004b2','parent','b');

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000004a1',false);
insert into expenses (family_id, title, amount, split_percent, paid_by, spent_on)
values (:'rodina', 'Boty', 1000, 40, auth.uid(), current_date - 35) returning id as v1 \gset
insert into expenses (family_id, title, amount, split_percent, paid_by, spent_on)
values (:'rodina', 'Obědy', 1180, 50, auth.uid(), current_date - 3) returning id as v2 \gset
insert into expenses (family_id, title, amount, split_percent, paid_by, spent_on)
values (:'rodina', 'Zubař', 600, 50, auth.uid(), current_date - 2) returning id as v3 \gset
select pozadej_o_proplaceni(:'v3') is not null as zadost_na_zubare;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000004b2',false);
insert into expenses (family_id, title, amount, split_percent, paid_by, spent_on)
values (:'rodina', 'Plavání', 3200, 50, auth.uid(), current_date - 1) returning id as v4 \gset
-- Zuzana (dlužník) si Vítovy výdaje vyrovnat nemůže — ani přímo, ani hromadně
update expenses set settled = true where id = :'v1';
select vyrovnej_vydaje(array[:'v1', :'v2']::uuid[]) as zuzana_vyrovnala;

-- Vít potvrdí všechno najednou: Plavání (zaplatila Zuzana) a Zubař (běží žádost) přeskočí
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000004a1',false);
select vyrovnej_vydaje(array[:'v1', :'v2', :'v3', :'v4']::uuid[]) as vit_vyrovnal;
select title, settled from expenses where family_id = :'rodina' order by spent_on;
select text from zpravy where family_id = :'rodina' and text like 'Potvrzuji, že je vyrovnáno%';
-- Vít může vyrovnání u svého výdaje zase zrušit
update expenses set settled = false where id = :'v2' returning settled;
reset role;
