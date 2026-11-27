-- ═══════════════════════════════════════════════════════════════════
--  Jedno místo zakládající rodiny na jednoho člověka.
--
--  Kdo založí druhou rodinu (zkouška, překlep v průvodci, dvojí klik),
--  nezabere další z 50 míst — druhá rodina dostane běžné zkušební
--  období. Místa jsou pro rodiny, ne pro pokusy jednoho účtu.
--
--  Nahrazuje funkci z 0030; zámek a počítání zůstávají stejné.
--  Spustit lze opakovaně.
-- ═══════════════════════════════════════════════════════════════════

create or replace function zaloz_zkusebni_obdobi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  obsazeno int;
  uz_ma boolean;
begin
  -- Zámek jen na dobu transakce: souběžné zakládání rodin se seřadí.
  perform pg_advisory_xact_lock(hashtext('zakladajici_rodiny'));

  select count(*) into obsazeno from predplatna where zakladajici;

  select exists (
    select 1
    from predplatna p
    join families f on f.id = p.family_id
    where p.zakladajici
      and f.created_by is not null
      and f.created_by = new.created_by
      and f.id <> new.id
  ) into uz_ma;

  if obsazeno < zakladajici_kapacita() and not uz_ma then
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
