-- Scénář: prohození dnů (migrace 0033). Pouští scripts/test-db.sh.
-- Řádky s ERROR jsou v očekávaném výstupu schválně.
\set ON_ERROR_STOP 0
grant all on all tables in schema public to authenticated;
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000d4','karel@x.cz','{"full_name":"Karel"}'),
 ('00000000-0000-0000-0000-0000000000e5','eva@x.cz','{"full_name":"Eva"}');

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000d4',false);
select create_family('Novákovi','Karel','a') as rodina \gset
reset role;
insert into family_members (family_id, user_id, role, custody_side) values (:'rodina','00000000-0000-0000-0000-0000000000e5','parent','b');

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000d4',false);
-- Výměna se nesmí krýt se dny změny
select navrhni_zmenu(:'rodina', null, current_date + 5, current_date + 7, 'a', null, current_date + 2, current_date + 6, current_date + 8);
-- Neúplná výměna
select navrhni_zmenu(:'rodina', null, current_date + 5, current_date + 7, 'a', null, current_date + 2, current_date + 12, null);
-- Karel si bere 5.–7. den, výměnou nabízí 12.–14. den Evě
select navrhni_zmenu(:'rodina', null, current_date + 5, current_date + 7, 'a', 'Svatba', current_date + 2, current_date + 12, current_date + 14) as z \gset
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e5',false);
select odpovez_na_zadost(:'z', true, null);
select day - current_date as den, side from custody_overrides where family_id = :'rodina' order by day;
select text from zpravy where family_id = :'rodina' order by created_at;
-- Starý tvar volání (bez výměny) dál funguje
select navrhni_zmenu(:'rodina', null, current_date + 20, current_date + 20, 'b', null, current_date + 3) is not null as jednostranna_jde;
reset role;
