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
