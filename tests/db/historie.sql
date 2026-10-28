-- Scénář: historie změn a výpisy (migrace 0034). Pouští scripts/test-db.sh.
-- Řádky s ERROR jsou v očekávaném výstupu schválně.
\set ON_ERROR_STOP 0
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000f6','ota@x.cz','{"full_name":"Ota"}'),
 ('00000000-0000-0000-0000-0000000000f7','vera@x.cz','{"full_name":"Věra"}');

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f6',false);
select create_family('Kovářovi','Ota','a') as rodina \gset
insert into children (family_id, name, color) values (:'rodina', 'Anna', '#0ea5e9') returning id as anna \gset
insert into expenses (family_id, category, title, amount, currency, spent_on, paid_by, split_percent)
  values (:'rodina', 'clothing', 'Zimní bunda', 1890, 'CZK', current_date, '00000000-0000-0000-0000-0000000000f6', 50) returning id as vydaj \gset
update expenses set amount = 2190 where id = :'vydaj';
update expenses set settled = true where id = :'vydaj';
insert into custody_overrides (family_id, day, side) values (:'rodina', current_date + 1, 'b');
reset role;
insert into family_members (family_id, user_id, role, custody_side) values (:'rodina','00000000-0000-0000-0000-0000000000f7','parent','b');

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f7',false);
delete from expenses where id = :'vydaj';
select kdo_jmeno, oblast, popis from historie where family_id = :'rodina' order by id;
-- Nikdo nesmí historii měnit ani mazat, ani zapsat podvrh
update historie set popis = 'přepsáno' where family_id = :'rodina';
delete from historie where family_id = :'rodina';
insert into historie (family_id, kdo_jmeno, oblast, popis) values (:'rodina', 'Podvrh', 'rozvrh', 'nic');
select count(*) as zaznamu_porad from historie where family_id = :'rodina';
-- Výpisy: z prohlížeče nejde zapsat
insert into vypisy (kod, family_id, druh, vytvoril_jmeno) values ('XXXX-XXXX', :'rodina', 'komunikace', 'Podvrh');
-- Cizí nevidí historii
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select count(*) as cizi_vidi_historii from historie where family_id = :'rodina';
reset role;
-- Smazání celé rodiny projde i s triggery
delete from families where id = :'rodina';
select count(*) as po_smazani from historie where family_id = :'rodina';
