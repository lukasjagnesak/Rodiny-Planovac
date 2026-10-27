-- Scénář: přístup pro profesionály (migrace 0035). Pouští scripts/test-db.sh.
-- Řádky s ERROR jsou v očekávaném výstupu schválně.
\set ON_ERROR_STOP 0
grant all on all tables in schema public to authenticated;
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000a1','pavel@x.cz','{"full_name":"Pavel"}'),
 ('00000000-0000-0000-0000-0000000000b2','lenka@x.cz','{"full_name":"Lenka"}'),
 ('00000000-0000-0000-0000-0000000000c3','advokatka@x.cz','{"full_name":"Mgr. Dvořáková"}'),
 ('00000000-0000-0000-0000-0000000000c4','cizi@x.cz','{"full_name":"Cizí"}');

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select create_family('Svobodovi','Pavel','a') as rodina \gset
reset role;
insert into family_members (family_id, user_id, role, custody_side) values (:'rodina','00000000-0000-0000-0000-0000000000b2','parent','b');

set role authenticated;
-- Lenka (není správce) zve advokátku; datum v minulosti a špatný e-mail neprojdou
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b2',false);
select pozvi_profesionala(:'rodina', 'advokatka@x.cz', 'advokat', current_date - 1);
select pozvi_profesionala(:'rodina', 'neni-email', 'advokat', null);
select pozvi_profesionala(:'rodina', ' Advokatka@X.cz ', 'advokat', current_date + 30) as token \gset
select role, profese, pristup_do - current_date as dni from family_invites where token = :'token';

-- Cizí člověk s přeposlaným odkazem se nepřipojí
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c4',false);
select accept_invite(:'token');
-- Advokátka ze svého e-mailu ano
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c3',false);
select accept_invite(:'token') = :'rodina' as prijato;
select role, profese, udelil = '00000000-0000-0000-0000-0000000000b2' as udelila_lenka from family_members where user_id = auth.uid();
-- Vidí rodinu, ale ne pozvánky a nic nezapíše
select count(*) as vidi_rodinu from families where id = :'rodina';
select count(*) as vidi_pozvanky from family_invites where family_id = :'rodina';
insert into custody_overrides (family_id, day, side) values (:'rodina', current_date, 'a');
select pozvi_profesionala(:'rodina', 'dalsi@x.cz', 'soud', null);

-- Pavel zve OSPOD a pozvánku zase ruší
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select pozvi_profesionala(:'rodina', 'ospod@x.cz', 'ospod', null) as token2 \gset
select zrus_pozvanku(id) from family_invites where token = :'token2';
select count(*) as zbyva_pozvanek from family_invites where family_id = :'rodina' and accepted_at is null;

-- Po datu konce advokátka do rodiny nevidí
reset role;
update family_members set pristup_do = current_date - 1 where user_id = '00000000-0000-0000-0000-0000000000c3';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c3',false);
select count(*) as vidi_po_konci from families where id = :'rodina';
select count(*) as vidi_profily from profiles where id <> auth.uid();

-- Pavel (přístup neuděloval) ho odebírá; odebrat rodiče takhle nejde
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select odeber_pristup(id) from family_members where user_id = '00000000-0000-0000-0000-0000000000b2';
select odeber_pristup(id) from family_members where user_id = '00000000-0000-0000-0000-0000000000c3';
select count(*) as profesionalu from family_members where family_id = :'rodina' and profese is not null;

select text from zpravy where family_id = :'rodina' order by created_at;
select popis from historie where family_id = :'rodina' and oblast = 'clenove' order by kdy;
reset role;

-- Člen si nesmí sám zvýšit roli (díra z 0002), jméno změnit smí
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b2',false);
update family_members set role = 'owner' where user_id = auth.uid();
update family_members set display_name = 'Máma' where user_id = auth.uid() returning display_name, role;
reset role;
