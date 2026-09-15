\set ON_ERROR_STOP on
\pset pager off

-- ═══════════════════════════════════════════════════════════════════
--  Komunikace se záznamem
--
--  Celá hodnota téhle funkce stojí na jediné vlastnosti: zprávu nejde
--  přepsat ani smazat. Kdyby to šlo, je záznam k ničemu — a nepoznalo
--  by se to, protože aplikace by se tvářila úplně stejně.
-- ═══════════════════════════════════════════════════════════════════

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select id as f from families limit 1 \gset

\echo '--- Z1) člen rodiny napíše zprávu'
insert into zpravy (family_id, autor, autor_jmeno, text, den)
values (:'f', '11111111-1111-1111-1111-111111111111', 'Táta',
        'V pátek to bude o hodinu později, mám poradu.', '2026-04-10')
returning id as zprava \gset

select count(*) as zprav from zpravy where family_id = :'f';

\echo '--- Z2) vlastní zprávu nejde přepsat ani vlastníkovi'
do $$
begin
  update zpravy set text = 'Něco úplně jiného';
  if found then raise exception 'CHYBA: zpráva šla přepsat'; end if;
  raise notice 'OK: úprava neprošla';
end $$;

\echo '--- Z3) ani smazat'
do $$
begin
  delete from zpravy;
  if found then raise exception 'CHYBA: zpráva šla smazat'; end if;
  raise notice 'OK: smazání neprošlo';
end $$;

\echo '--- Z4) nejde psát cizím jménem'
do $$
begin
  insert into zpravy (family_id, autor, autor_jmeno, text)
  values ((select id from families limit 1),
          '22222222-2222-2222-2222-222222222222', 'Máma', 'Podvrh');
  raise exception 'CHYBA: prošla zpráva podepsaná někým jiným';
exception
  when insufficient_privilege then raise notice 'OK: cizí podpis odmítnut';
end $$;

\echo '--- Z5) prázdná zpráva neprojde'
do $$
begin
  insert into zpravy (family_id, autor, autor_jmeno, text)
  values ((select id from families limit 1),
          '11111111-1111-1111-1111-111111111111', 'Táta', '    ');
  raise exception 'CHYBA: prošla prázdná zpráva';
exception
  when check_violation then raise notice 'OK: prázdná zpráva odmítnuta';
end $$;

\echo '--- Z6) přečtení se zapíše jednou a podruhé už ne'
insert into zpravy_precteni (zprava_id, user_id)
values (:'zprava', '11111111-1111-1111-1111-111111111111');

insert into zpravy_precteni (zprava_id, user_id)
values (:'zprava', '11111111-1111-1111-1111-111111111111')
on conflict do nothing;

select count(*) as precteni from zpravy_precteni where zprava_id = :'zprava';

\echo '--- Z7) cizí přečtení si nikdo nezapíše'
do $$
begin
  insert into zpravy_precteni (zprava_id, user_id)
  values ((select id from zpravy limit 1), '22222222-2222-2222-2222-222222222222');
  raise exception 'CHYBA: prošlo cizí přečtení';
exception
  when insufficient_privilege then raise notice 'OK: cizí přečtení odmítnuto';
end $$;

-- ── Po vypršení předplatného ──────────────────────────────────────
reset role;
reset request.jwt.claim.sub;
insert into predplatna (family_id, stav, plati_do)
values (:'f', 'vyprsel', now() - interval '1 day')
on conflict (family_id) do update
  set stav = excluded.stav, plati_do = excluded.plati_do;

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

\echo '--- Z8) v režimu čtení se nepíše'
do $$
begin
  insert into zpravy (family_id, autor, autor_jmeno, text)
  values ((select id from families limit 1),
          '11111111-1111-1111-1111-111111111111', 'Táta', 'Po vypršení');
  raise exception 'CHYBA: zpráva prošla i po vypršení';
exception
  when insufficient_privilege then raise notice 'OK: zápis zamčen';
end $$;

\echo '--- Z9) ale co je napsané, zůstává čitelné'
select count(*) as viditelnych from zpravy where family_id = :'f';

reset role;
reset request.jwt.claim.sub;
update predplatna set stav = 'zkusebni', plati_do = now() + interval '20 days'
where family_id = :'f';

\echo '=== ZPRÁVY PROŠLY ==='
