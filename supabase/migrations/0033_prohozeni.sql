-- ═══════════════════════════════════════════════════════════════════
--  Prohození dnů: „tenhle víkend si je vezmu já, za to ty máš ten příští".
--
--  Navazuje na 0032. Žádost může mít kromě dnů, které si navrhující
--  bere (nebo dává), i dny výměnou — ty připadnou druhé straně. Obojí se
--  schvaluje jedním souhlasem a propíše se najednou. Bez druhé části
--  je to dál obyčejná jednostranná změna.
--
--  Spustit lze opakovaně.
-- ═══════════════════════════════════════════════════════════════════

alter table zadosti_zmeny add column if not exists vymena_od date;
alter table zadosti_zmeny add column if not exists vymena_do date;

alter table zadosti_zmeny drop constraint if exists zadosti_zmeny_vymena_check;
alter table zadosti_zmeny add constraint zadosti_zmeny_vymena_check check (
  (vymena_od is null and vymena_do is null)
  or (
    vymena_od is not null and vymena_do is not null
    and vymena_do >= vymena_od
    and vymena_do - vymena_od <= 62
    -- Dny výměnou se nesmí krýt se dny změny, jinak by druhá polovina
    -- přepsala první.
    and (vymena_do < od or vymena_od > do_dne)
  )
);

create or replace function opacna_strana(s custody_side)
returns custody_side
language sql
immutable
as $$ select case s when 'a' then 'b'::custody_side else 'a'::custody_side end $$;

-- Zapíše dny jako výjimky — jen z funkcí níž, po souhlasu.
create or replace function zapis_dny_zmeny(
  rodina uuid, dite uuid, od date, do_dne date, strana custody_side, duvod text, kdo uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d date := greatest(od, current_date);
begin
  while d <= do_dne loop
    delete from custody_overrides
    where family_id = rodina and day = d
      and coalesce(child_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = coalesce(dite, '00000000-0000-0000-0000-000000000000'::uuid);
    insert into custody_overrides (family_id, child_id, day, side, reason, created_by)
    values (rodina, dite, d, strana, duvod, kdo);
    d := d + 1;
  end loop;
end;
$$;

revoke execute on function zapis_dny_zmeny(uuid, uuid, date, date, custody_side, text, uuid) from public, anon, authenticated;

-- Popis žádosti do zpráv: „1. 11.–3. 11. u: Petr, výměnou 8. 11.–10. 11. u: Jana"
create or replace function popis_zadosti(z zadosti_zmeny)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rozsah_dnu(z.od, z.do_dne) || ' u: ' || jmeno_strany(z.family_id, z.strana)
    || case when z.vymena_od is not null
         then ', výměnou ' || rozsah_dnu(z.vymena_od, z.vymena_do)
              || ' u: ' || jmeno_strany(z.family_id, opacna_strana(z.strana))
         else '' end;
$$;

-- ── Návrh (nahrazuje verzi z 0032) ────────────────────────────────
drop function if exists navrhni_zmenu(uuid, uuid, date, date, custody_side, text, date);

create or replace function navrhni_zmenu(
  target_family uuid,
  dite uuid,
  od date,
  do_dne date,
  strana custody_side,
  duvod text,
  odpovedet_do date,
  vymena_od date default null,
  vymena_do date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  nova uuid;
  z zadosti_zmeny%rowtype;
  jmeno_ditete text;
begin
  if auth.uid() is null or not can_edit_family(target_family) then
    raise exception 'Změnu rozvrhu teď navrhnout nemůžete.';
  end if;
  if od < current_date or (vymena_od is not null and vymena_od < current_date) then
    raise exception 'Změnu nejde navrhnout zpětně.';
  end if;
  if (vymena_od is null) <> (vymena_do is null) then
    raise exception 'U výměny vyplňte od kdy i do kdy.';
  end if;
  if vymena_od is not null and not (vymena_do < od or vymena_od > do_dne) then
    raise exception 'Dny výměnou se nesmí krýt se dny změny.';
  end if;
  if odpovedet_do < current_date or odpovedet_do > least(od, coalesce(vymena_od, od)) then
    raise exception 'Termín odpovědi musí být mezi dneškem a prvním dnem změny.';
  end if;
  if dite is not null and not exists (
    select 1 from children where id = dite and family_id = target_family
  ) then
    raise exception 'Dítě do rodiny nepatří.';
  end if;

  insert into zadosti_zmeny (family_id, child_id, od, do_dne, strana, duvod, navrhl, navrhl_jmeno,
                             odpovedet_do, vymena_od, vymena_do)
  values (target_family, dite, od, do_dne, strana, nullif(btrim(duvod), ''), auth.uid(),
          jmeno_clena(target_family, auth.uid()), odpovedet_do, vymena_od, vymena_do)
  returning * into z;
  nova := z.id;

  select name into jmeno_ditete from children where id = dite;

  perform zapis_zpravu_zmeny(
    target_family, auth.uid(),
    case when vymena_od is null then 'Navrhuji změnu rozvrhu: ' else 'Navrhuji prohození: ' end
      || popis_zadosti(z)
      || coalesce(' (' || jmeno_ditete || ')', '') || '.'
      || coalesce(' Důvod: ' || nullif(btrim(duvod), '') || '.', '')
      || ' Odpověď prosím do ' || to_char(odpovedet_do, 'FMDD. FMMM.') || ' v Kalendáři.',
    od
  );

  return nova;
end;
$$;

-- ── Odpověď (nahrazuje verzi z 0032) ──────────────────────────────
create or replace function odpovez_na_zadost(zadost uuid, schvalit boolean, text_odpovedi text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  z zadosti_zmeny%rowtype;
  duvod text;
begin
  select * into z from zadosti_zmeny where id = zadost for update;
  if z.id is null then
    raise exception 'Žádost neexistuje.';
  end if;
  if auth.uid() is null or not can_edit_family(z.family_id) then
    raise exception 'Na žádost teď odpovědět nemůžete.';
  end if;
  if z.navrhl = auth.uid() then
    raise exception 'Vlastní návrh schválit nejde. Odpovídá druhý rodič.';
  end if;
  if z.stav <> 'ceka' then
    raise exception 'Žádost už je vyřízená.';
  end if;
  -- Prohození, jehož polovina už proběhla, by bylo nespravedlivé
  -- schválit — jeden by dostal dny, druhý už ne.
  if schvalit and (z.do_dne < current_date or (z.vymena_do is not null and z.vymena_do < current_date)) then
    raise exception 'Změna už proběhla, schválit ji nejde.';
  end if;

  update zadosti_zmeny
  set stav = case when schvalit then 'schvaleno' else 'zamitnuto' end,
      odpovedel = auth.uid(),
      odpoved = nullif(btrim(text_odpovedi), ''),
      vyrizeno_at = now()
  where id = z.id;

  if schvalit then
    -- Funkce běží s právy vlastníka, takže ji politika „jen bez druhého
    -- rodiče" nezastaví — právě proto, že souhlas druhého rodiče teď je.
    duvod := coalesce('Schválená změna: ' || z.duvod, 'Schválená změna rozvrhu');
    perform zapis_dny_zmeny(z.family_id, z.child_id, z.od, z.do_dne, z.strana, duvod, z.navrhl);
    if z.vymena_od is not null then
      perform zapis_dny_zmeny(z.family_id, z.child_id, z.vymena_od, z.vymena_do,
                              opacna_strana(z.strana), duvod, z.navrhl);
    end if;
  end if;

  perform zapis_zpravu_zmeny(
    z.family_id, auth.uid(),
    case when schvalit then 'Souhlasím: ' else 'Nesouhlasím: ' end
      || case when z.vymena_od is null then 'změna rozvrhu ' else 'prohození ' end
      || popis_zadosti(z) || '.'
      || coalesce(' ' || nullif(btrim(text_odpovedi), ''), ''),
    z.od
  );
end;
$$;

-- ── Zrušení (nahrazuje verzi z 0032, jen text zprávy) ─────────────
create or replace function zrus_zadost(zadost uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  z zadosti_zmeny%rowtype;
begin
  select * into z from zadosti_zmeny where id = zadost for update;
  if z.id is null or z.navrhl is distinct from auth.uid() then
    raise exception 'Zrušit jde jen vlastní návrh.';
  end if;
  if z.stav <> 'ceka' then
    raise exception 'Žádost už je vyřízená.';
  end if;

  update zadosti_zmeny set stav = 'zruseno', vyrizeno_at = now() where id = z.id;

  perform zapis_zpravu_zmeny(
    z.family_id, auth.uid(),
    'Ruším svůj návrh: ' || popis_zadosti(z) || '.',
    z.od
  );
end;
$$;

grant execute on function navrhni_zmenu(uuid, uuid, date, date, custody_side, text, date, date, date) to authenticated;
grant execute on function odpovez_na_zadost(uuid, boolean, text) to authenticated;
grant execute on function zrus_zadost(uuid) to authenticated;
