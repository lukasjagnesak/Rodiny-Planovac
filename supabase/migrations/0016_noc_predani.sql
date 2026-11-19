-- ═══════════════════════════════════════════════════════════════════
--  Kdo má dítě v noci na dni předání
--
--  Noc patří tomu, u koho dítě usíná. Na dni předání to ale z rozpisu
--  dnů odvodit nejde: dva zaškrtnuté dny můžou být jedna noc i dvě podle
--  toho, jestli se předává odpoledne, nebo až ráno. Dokud to nebylo kde
--  zapsat, počítal kalendář noci jako dny — což u krátkých pobytů
--  přepočítávalo čas u rodiče, ze kterého se odvíjí i výživné.
--
--  `predavka_vecer` je výchozí pravidlo pro celý vzor střídání,
--  `nocni_strana` je ruční výjimka na konkrétní den.
-- ═══════════════════════════════════════════════════════════════════

-- Výchozí pravidlo: předává se odpoledne nebo večer posledního dne
-- pobytu, takže dítě tu noc spí už u přebírajícího rodiče.
alter table custody_patterns
  add column if not exists predavka_vecer boolean not null default true;

comment on column custody_patterns.predavka_vecer is
  'true = na dni předání dítě spí u přebírajícího rodiče (předává se přes den). '
  'false = přespí ještě u odcházejícího a odjíždí ráno.';

-- Výjimka na konkrétní den. NULL = platí pravidlo ze vzoru.
alter table custody_overrides
  add column if not exists nocni_strana custody_side;

comment on column custody_overrides.nocni_strana is
  'U koho dítě tu noc spí. NULL = řídí se podle predavka_vecer ve vzoru.';

-- Výjimka může měnit jen noc, ne celý den — pak by `side` neměla co říct.
alter table custody_overrides
  alter column side drop not null;

-- Prázdný řádek by nedával smysl ani jedno.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'custody_overrides_neco_meni'
  ) then
    alter table custody_overrides
      add constraint custody_overrides_neco_meni
      check (side is not null or nocni_strana is not null);
  end if;
end $$;
