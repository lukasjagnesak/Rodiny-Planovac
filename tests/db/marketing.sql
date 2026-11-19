-- Scénář: marketingové souhlasy a fronta pro Mailchimp (migrace 0044).
-- Každý řádek výstupu má být `t`, kromě míst označených „ERROR čekaný“.
\set ON_ERROR_STOP 0
grant all on all tables in schema public to authenticated;
grant execute on all functions in schema public to service_role;

-- 1) Registrace se souhlasem: metadata → kontakt, historie, úloha ve frontě
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000c001','ano@x.cz',
  '{"full_name":"Jana Ano","marketing_souhlas":true,"marketing_verze":"2026-11-v1","marketing_zdroj":"registrace"}');
select souhlas and souhlas_verze = '2026-11-v1' and souhlas_at is not null and zdroj = 'registrace' as s1_kontakt
  from marketing_kontakty where user_id = '00000000-0000-0000-0000-00000000c001';
select count(*) = 1 as s1_historie from marketing_souhlasy_historie
 where user_id = '00000000-0000-0000-0000-00000000c001' and udalost = 'udelen' and verze = '2026-11-v1';
select count(*) = 1 as s1_fronta from marketing_fronta
 where user_id = '00000000-0000-0000-0000-00000000c001' and druh = 'sync' and stav = 'ceka';

-- 2) Registrace bez souhlasu: nic, ani ve frontě
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000c002','ne@x.cz','{"full_name":"Petr Ne"}');
select not exists (select 1 from marketing_kontakty where user_id = '00000000-0000-0000-0000-00000000c002')
   and not exists (select 1 from marketing_fronta where user_id = '00000000-0000-0000-0000-00000000c002') as s2_nic;

-- 2b) Neznámá verze textu: účet vznikne, souhlas ne
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000c003','podvrh@x.cz',
  '{"full_name":"Podvrh","marketing_souhlas":true,"marketing_verze":"neexistuje"}');
select exists (select 1 from profiles where id = '00000000-0000-0000-0000-00000000c003')
   and not exists (select 1 from marketing_kontakty where user_id = '00000000-0000-0000-0000-00000000c003') as s2b_ucet_bez_souhlasu;

-- 3) Fronta: deset změn = jedna čekající úloha
select marketing_zarad('00000000-0000-0000-0000-00000000c001');
select marketing_zarad('00000000-0000-0000-0000-00000000c001');
update profiles set full_name = 'Jana Nová' where id = '00000000-0000-0000-0000-00000000c001';
select count(*) = 1 as s3_jedna_cekajici from marketing_fronta
 where user_id = '00000000-0000-0000-0000-00000000c001' and stav = 'ceka';

-- 4) Uživatel mění souhlas jen přes RPC, ne přímým zápisem
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000c002',false);
select (nastav_marketing_souhlas(true, '2026-11-v1', 'nastaveni')).souhlas as s4_udelen;
select (nastav_marketing_souhlas(true, '2026-11-v1', 'nastaveni')).souhlas as s4_dvojklik;
select count(*) = 1 as s4_jeden_zaznam from marketing_souhlasy_historie where user_id = auth.uid();
update marketing_kontakty set souhlas = false where user_id = auth.uid();
select souhlas as s4_primy_zapis_nic_nezmenil from marketing_kontakty where user_id = auth.uid();
-- cizí kontakt nevidí
select count(*) = 0 as s4_cizi_nevidi from marketing_kontakty where user_id = '00000000-0000-0000-0000-00000000c001';
-- funkce workeru nesmí volat (ERROR čekaný: permission denied)
select marketing_zarad('00000000-0000-0000-0000-00000000c001');
select marketing_stav('00000000-0000-0000-0000-00000000c001');
-- odvolání
select (nastav_marketing_souhlas(false, null, 'nastaveni')).souhlas = false as s4_odvolan;
select odvolano_at is not null as s4_cas_odvolani from marketing_kontakty where user_id = auth.uid();
reset role;
select array_agg(udalost order by id) = '{udelen,odvolan}' as s4_historie
  from marketing_souhlasy_historie where user_id = '00000000-0000-0000-0000-00000000c002';

-- 5) Historie se nepřepisuje ani nemaže (ERROR čekaný ×2)
update marketing_souhlasy_historie set udalost = 'odvolan' where user_id = '00000000-0000-0000-0000-00000000c001';
delete from marketing_souhlasy_historie where user_id = '00000000-0000-0000-0000-00000000c001';
select count(*) = 1 as s5_historie_nedotcena from marketing_souhlasy_historie
 where user_id = '00000000-0000-0000-0000-00000000c001' and udalost = 'udelen';

-- 6) Worker bere úlohy jednou (skip locked) a znovu až po 15 minutách
select count(*) >= 2 as s6_vzal from marketing_fronta_vezmi(10);
select count(*) = 0 as s6_podruhe_nic from marketing_fronta_vezmi(10);
update marketing_fronta set zamceno_at = now() - interval '20 minutes' where stav = 'zpracovava';
select count(*) >= 2 as s6_zaseknute_znovu from marketing_fronta_vezmi(10);
update marketing_fronta set stav = 'hotovo', hotovo_at = now();

-- 7) Stav pro worker: e-mail z auth.users, ne z profiles
update auth.users set email = 'jana.nova@x.cz' where id = '00000000-0000-0000-0000-00000000c001';
select (marketing_stav('00000000-0000-0000-0000-00000000c001') ->> 'email') = 'jana.nova@x.cz' as s7_email_z_auth;
select count(*) = 1 as s7_zmena_emailu_zaradila from marketing_fronta
 where user_id = '00000000-0000-0000-0000-00000000c001' and stav = 'ceka';
update marketing_fronta set stav = 'hotovo', hotovo_at = now();

-- 8) Uvítání jen jednou
select marketing_zaber_uvitani('00000000-0000-0000-0000-00000000c001') as s8_poprve;
select not marketing_zaber_uvitani('00000000-0000-0000-0000-00000000c001') as s8_podruhe_ne;

-- 9) Webhook: potvrzení double opt-in, duplicita, odhlášení, zastaralé odhlášení
update marketing_kontakty set mc_status = 'pending', mc_email = 'jana.nova@x.cz', mc_status_at = now() - interval '1 hour'
 where user_id = '00000000-0000-0000-0000-00000000c001';
select marketing_mailchimp_udalost('k1','subscribe','jana.nova@x.cz',null, now(), '00000000-0000-0000-0000-00000000c001') = 'prihlaseno' as s9_prihlaseno;
select exists (select 1 from marketing_souhlasy_historie where user_id = '00000000-0000-0000-0000-00000000c001' and udalost = 'potvrzen_double_opt_in') as s9_doi_v_historii;
select marketing_mailchimp_udalost('k1','subscribe','jana.nova@x.cz',null, now(), '00000000-0000-0000-0000-00000000c001') = 'duplicitni' as s9_duplicita;
-- Podvržené KLIDOO_ID s cizí adresou kontakt nenajde
select marketing_mailchimp_udalost('k2','unsubscribe','utocnik@x.cz',null, now(), '00000000-0000-0000-0000-00000000c001') = 'neznamy-kontakt' as s9_podvrh;
select souhlas as s9_souhlas_trva from marketing_kontakty where user_id = '00000000-0000-0000-0000-00000000c001';
-- Skutečné odhlášení
select marketing_mailchimp_udalost('k3','unsubscribe','jana.nova@x.cz',null, now(), null) = 'odhlaseno' as s9_odhlaseno;
select not souhlas and mc_status = 'unsubscribed' and mc_odhlaseno_at is not null as s9_stav
  from marketing_kontakty where user_id = '00000000-0000-0000-0000-00000000c001';
-- Profil se změní, ale do fronty se nic nepřidá (není souhlas ani přihlášení)
update marketing_fronta set stav = 'hotovo', hotovo_at = now();
update profiles set full_name = 'Jana Zase' where id = '00000000-0000-0000-0000-00000000c001';
select count(*) = 0 as s9_profil_po_odhlaseni_nic from marketing_fronta
 where user_id = '00000000-0000-0000-0000-00000000c001' and stav = 'ceka';
-- Nový souhlas v Klidoo, pak opožděně doručené STARÉ odhlášení: ignorovat
update marketing_kontakty set souhlas = true, souhlas_at = now() where user_id = '00000000-0000-0000-0000-00000000c001';
select marketing_mailchimp_udalost('k4','unsubscribe','jana.nova@x.cz',null, now() - interval '1 day', null) = 'zastarale' as s9_stare_odhlaseni;
-- Změna adresy přímo v Mailchimpu
select marketing_mailchimp_udalost('k5','upemail','jana.nova@x.cz','jina@x.cz', now(), null) = 'email-zmenen' as s9_upemail;
select mc_email = 'jina@x.cz' as s9_nova_adresa from marketing_kontakty where user_id = '00000000-0000-0000-0000-00000000c001';
-- Nedoručitelná adresa
select marketing_mailchimp_udalost('k6','cleaned','jina@x.cz',null, now(), null) = 'cleaned' as s9_cleaned;

-- 10) Odhlašovací odkaz z našeho e-mailu odvolá i marketing
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000c002',false);
select (nastav_marketing_souhlas(true, '2026-11-v1', 'nastaveni')).souhlas as s10_souhlas;
reset role;
select marketing_odhlasit_email(' NE@x.cz ', 'odhlasovaci-odkaz') = 1 as s10_odhlaseno;
select not souhlas as s10_bez_souhlasu from marketing_kontakty where user_id = '00000000-0000-0000-0000-00000000c002';

-- 11) Smazání účtu: úloha na výmaz z Mailchimpu, historie zůstane anonymně
delete from auth.users where id = '00000000-0000-0000-0000-00000000c001';
select count(*) = 1 as s11_uloha_smazat from marketing_fronta where druh = 'smazat' and mc_email = 'jina@x.cz';
select count(*) = 0 as s11_bez_vazby from marketing_souhlasy_historie where user_id = '00000000-0000-0000-0000-00000000c001';
select count(*) >= 5 as s11_historie_anonymne from marketing_souhlasy_historie where user_id is null;

-- 12) Rekonciliace zařadí nesynchronizované kontakty
update marketing_fronta set stav = 'hotovo', hotovo_at = now() where stav = 'ceka';
update marketing_kontakty set souhlas = true where user_id = '00000000-0000-0000-0000-00000000c002';
update marketing_fronta set stav = 'hotovo', hotovo_at = now() where stav = 'ceka';
select marketing_rekonciliace(10) = 1 as s12_rekonciliace;
select marketing_rekonciliace(10) = 0 as s12_podruhe_nic;
