-- ═══════════════════════════════════════════════════════════════════
--  Zakládající rodiny: prvních 50 rodin má Klidoo rok zdarma.
--
--  Proč: lidé registraci nedokončují, protože se bojí, že je to bude
--  něco stát. Prvních padesát rodin dostane rok bez placení a bez karty
--  — výměnou jen prosíme o zpětnou vazbu (není to podmínka).
--
--  Proč v databázi, ne v aplikaci: počítat volná místa v aplikaci
--  znamená, že dvě rodiny založené ve stejnou chvíli obě uvidí
--  „zbývá 1" a obě ho dostanou. Tady se počítá pod zámkem transakce,
--  takže padesát jedniček je opravdu padesát.
--
--  Rok běží od založení rodiny. Po něm rodina pokračuje jako každá
--  jiná — nic se nesmaže, jen se zamkne zápis, dokud nezaplatí.
--
--  Spustit lze opakovaně.
-- ═══════════════════════════════════════════════════════════════════

alter table predplatna
  add column if not exists zakladajici boolean not null default false;

-- Kolik míst nabídka má. Jediné místo, kde se to číslo mění.
create or replace function zakladajici_kapacita()
returns int
language sql
immutable
as $$ select 50 $$;

create or replace function zaloz_zkusebni_obdobi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  obsazeno int;
begin
  -- Zámek jen na dobu transakce: souběžné zakládání rodin se seřadí.
  perform pg_advisory_xact_lock(hashtext('zakladajici_rodiny'));

  select count(*) into obsazeno from predplatna where zakladajici;

  if obsazeno < zakladajici_kapacita() then
    insert into predplatna (family_id, stav, plati_do, zakladajici)
    values (new.id, 'zkusebni', now() + interval '1 year', true)
    on conflict (family_id) do nothing;
  else
    insert into predplatna (family_id, stav, plati_do)
    values (new.id, 'zkusebni', now() + interval '30 days')
    on conflict (family_id) do nothing;
  end if;

  return new;
end;
$$;

-- Rodiny, které už existují a nezaplatily, jsou ty úplně první.
-- Dostanou rok od svého založení, v pořadí, jak vznikly.
with kandidati as (
  select p.family_id
  from predplatna p
  join families f on f.id = p.family_id
  where not p.zakladajici
    and p.stav in ('zkusebni', 'vyprsel')
  order by f.created_at
  limit greatest(
    zakladajici_kapacita() - (select count(*) from predplatna where zakladajici)::int,
    0
  )
)
update predplatna p
set zakladajici = true,
    stav = 'zkusebni',
    plati_do = greatest(p.plati_do, f.created_at + interval '1 year'),
    updated_at = now()
from kandidati k, families f
where p.family_id = k.family_id
  and f.id = p.family_id;

-- Kolik míst ještě zbývá. Volá to veřejný web bez přihlášení, proto
-- `security definer` a jen jedno číslo — nic o rodinách samotných.
create or replace function zakladajici_volno()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select greatest(zakladajici_kapacita() - count(*)::int, 0)
  from predplatna
  where zakladajici
$$;

grant execute on function zakladajici_volno() to anon, authenticated;
