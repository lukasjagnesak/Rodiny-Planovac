-- Scénář: žádost o proplacení výdaje (migrace 0036). Pouští scripts/test-db.sh.
-- Řádky s ERROR jsou v očekávaném výstupu schválně.
\set ON_ERROR_STOP 0
grant all on all tables in schema public to authenticated;
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000f1','tomas@x.cz','{"full_name":"Tomáš"}'),
 ('00000000-0000-0000-0000-0000000000f2','iva@x.cz','{"full_name":"Iva"}');

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1',false);
select create_family('Černí','Tomáš','a') as rodina \gset
insert into expenses (family_id, title, amount, split_percent, paid_by, spent_on)
values (:'rodina', 'Zubař', 1234.50, 50, auth.uid(), current_date) returning id as vydaj \gset
-- Sám v rodině žádat nejde
select pozadej_o_proplaceni(:'vydaj');
reset role;
insert into family_members (family_id, user_id, role, custody_side) values (:'rodina','00000000-0000-0000-0000-0000000000f2','parent','b');

set role authenticated;
-- Iva výdaj neplatila, žádat nesmí
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f2',false);
select pozadej_o_proplaceni(:'vydaj');
-- Přímý zápis do tabulky nejde
insert into zadosti_proplaceni (family_id, expense_id, pozadal_jmeno, castka) values (:'rodina', :'vydaj', 'x', 1);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1',false);
select pozadej_o_proplaceni(:'vydaj', 'Faktura v příloze.') as z \gset
select pozadej_o_proplaceni(:'vydaj');
select castka, stav from zadosti_proplaceni where id = :'z';
-- Vlastní žádost schválit nejde; výdaj teď nejde přepsat ani smazat
select odpovez_na_proplaceni(:'z', true);
update expenses set amount = 9999 where id = :'vydaj';
update expenses set settled = true where id = :'vydaj';
delete from expenses where id = :'vydaj';
update expenses set note = 'poznámka jde' where id = :'vydaj' returning note;

-- Iva rozporuje bez důvodu (nejde), pak s důvodem
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f2',false);
select odpovez_na_proplaceni(:'z', false);
select odpovez_na_proplaceni(:'z', false, 'Domluvili jsme se na jiném zubaři.');
select stav, duvod from zadosti_proplaceni where id = :'z';

-- Tomáš ruší, upraví podíl a žádá znovu; Iva schválí
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1',false);
select zrus_proplaceni(:'z');
update expenses set split_percent = 30 where id = :'vydaj';
select pozadej_o_proplaceni(:'vydaj') as z2 \gset
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f2',false);
select odpovez_na_proplaceni(:'z2', true);
-- Příjem nepotvrzuje ten, kdo platí
select potvrd_proplaceni(:'z2');
select zrus_proplaceni(:'z2');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1',false);
select zrus_proplaceni(:'z2');
select potvrd_proplaceni(:'z2');
select z.stav, z.castka, e.settled from zadosti_proplaceni z join expenses e on e.id = z.expense_id where z.id = :'z2';
-- Vypořádaný výdaj už žádost nedostane; po vypořádání jde smazat
select pozadej_o_proplaceni(:'vydaj');

select text from zpravy where family_id = :'rodina' order by created_at;
select popis from historie where family_id = :'rodina' and popis like '%proplacení%' order by kdy;
reset role;
-- Smazání rodiny projde i s výdaji
delete from families where id = :'rodina';
select count(*) as zbylo from zadosti_proplaceni where family_id = :'rodina';
