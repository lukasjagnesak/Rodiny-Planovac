-- Scénář: žádost o změnu rozvrhu (migrace 0032) a zakládající rodiny (0030).
-- Pouští scripts/test-db.sh. Řádky s ERROR jsou v očekávaném výstupu schválně.
\set ON_ERROR_STOP 0
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000a1','petr@x.cz','{"full_name":"Petr"}'),
 ('00000000-0000-0000-0000-0000000000b2','jana@x.cz','{"full_name":"Jana"}'),
 ('00000000-0000-0000-0000-0000000000c3','sam@x.cz','{"full_name":"Samotář"}');
select count(*) as profilu from profiles;

-- Petr založí rodinu
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select create_family('Dvořákovi','Petr','a') as rodina \gset
select stav, zakladajici, (plati_do::date - current_date) as dni from predplatna where family_id = :'rodina';
select zakladajici_volno() as volno;
-- Sám v rodině: přímý zápis jde
insert into custody_overrides (family_id, day, side) values (:'rodina', current_date + 3, 'b');
select count(*) as vyjimek_sam from custody_overrides where family_id = :'rodina';
reset role;
-- Jana se připojí jako druhý rodič
insert into family_members (family_id, user_id, role, custody_side) values (:'rodina','00000000-0000-0000-0000-0000000000b2','parent','b');

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select ma_dva_rodice(:'rodina') as dva;
-- Přímý zápis teď neprojde
insert into custody_overrides (family_id, day, side) values (:'rodina', current_date + 4, 'a');
delete from custody_overrides where family_id = :'rodina';
select count(*) as vyjimek_po_pokusu from custody_overrides where family_id = :'rodina';
-- Petr navrhne
select navrhni_zmenu(:'rodina', null, current_date + 5, current_date + 7, 'a', 'Svatba sestry', current_date + 2) as zadost \gset
-- Petr nesmí schválit sám sobě
select odpovez_na_zadost(:'zadost', true, null);
-- Zpětně navrhovat nejde
select navrhni_zmenu(:'rodina', null, current_date - 1, current_date, 'a', null, current_date);
-- Jana schválí
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b2',false);
select odpovez_na_zadost(:'zadost', true, 'V pořádku.');
select stav from zadosti_zmeny where id = :'zadost';
select day - current_date as den, side, reason from custody_overrides where family_id = :'rodina' order by day;
select autor_jmeno, text from zpravy where family_id = :'rodina' order by created_at;
-- Podruhé už ne
select odpovez_na_zadost(:'zadost', false, null);
-- Jana navrhne, Petr zamítne
select navrhni_zmenu(:'rodina', null, current_date + 10, current_date + 10, 'b', null, current_date + 3) as z2 \gset
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select odpovez_na_zadost(:'z2', false, 'Ten den máme výlet.');
select count(*) as vyjimek_den10 from custody_overrides where family_id = :'rodina' and day = current_date + 10;
-- Změna vzoru se zapíše do zpráv
insert into custody_patterns (family_id, kind, starts_on, anchor_date, anchor_side, handover_dow, handover_time) values (:'rodina','alternating_weeks', current_date, current_date, 'a', 5, '17:00');
select text from zpravy where family_id = :'rodina' order by created_at desc limit 1;
-- Cizí uživatel nevidí nic a nic nesmí
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c3',false);
select count(*) as cizi_vidi from zadosti_zmeny;
select navrhni_zmenu(:'rodina', null, current_date + 5, current_date + 7, 'a', null, current_date + 2);
reset role;
