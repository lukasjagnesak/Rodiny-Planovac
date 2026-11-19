-- Scénář: počítadlo zakládajících rodin odpovídá databázi (migrace 0030).
-- Číslo na webu (/api/zakladajici) je přesně tohle `zakladajici_volno()`.
\set ON_ERROR_STOP 0
grant all on all tables in schema public to authenticated;
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000005a1','pocitadlo@x.cz','{"full_name":"Počítadlo"}');

select (select count(*) from predplatna where zakladajici) + zakladajici_volno() = 50 as soucet_sedi;
select zakladajici_volno() as volno_pred \gset

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000005a1',false);
select create_family('Počítadlovi','Počítadlo','a') as rodina \gset
reset role;
-- Nová rodina ubere jedno místo (dokud nějaké zbývá)
select zakladajici_volno() = greatest(:volno_pred - 1, 0) as ubrala_misto;
-- Smazaná rodina místo vrátí
delete from families where id = :'rodina';
select zakladajici_volno() = :volno_pred as vratila_misto;

-- Jedno místo na člověka (0043): druhá rodina téhož účtu místo nezabere
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000005b2','dvakrat@x.cz','{"full_name":"Dvakrát"}');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000005b2',false);
select create_family('První','Dvakrát','a') as r1 \gset
select create_family('Druhá','Dvakrát','a') as r2 \gset
reset role;
select f.name, p.zakladajici, (p.plati_do::date - current_date) as dni
from predplatna p join families f on f.id = p.family_id
where f.id in (:'r1', :'r2') order by f.created_at;
