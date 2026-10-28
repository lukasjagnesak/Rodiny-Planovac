-- ═══════════════════════════════════════════════════════════════════
--  Žádost o změnu rozvrhu se schválením druhým rodičem.
--
--  Dosud mohl kterýkoli rodič zapsat do kalendáře výjimku sám — „tenhle
--  víkend jsou u mě" — a druhý se to dozvěděl, až když se podíval. Pro
--  rodiče, kteří spolu vycházejí, drobnost. Pro ty, kteří spolu nemluví,
--  přesně ten typ zásahu, ze kterého je další podání k soudu.
--
--  Od teď platí: jakmile má rodina **dva rodiče** (dva členy se stranou
--  péče a rolí owner/parent), výjimku do kalendáře nejde zapsat přímo.
--  Jeden rodič navrhne, druhý schválí nebo zamítne. Po schválení se
--  změna propíše do kalendáře sama. Hlídá to databáze, ne aplikace —
--  přímý zápis do `custody_overrides` politiky odmítnou.
--
--  Rodič, který Klidoo používá sám, zapisuje dál přímo. Schvalovat
--  nemá kdo a čekat na nikoho nedává smysl.
--
--  Každý krok (návrh, schválení, zamítnutí, zrušení) se zapíše i do
--  Zpráv. Ty nejdou upravit ani smazat, takže historie změn rozvrhu je
--  ve výpisu pro advokáta i soud — bez další tabulky „historie".
--
--  Změny vzoru střídání (`custody_patterns`) se zatím neschvalují, ale
--  při dvou rodičích se každá zapíše do Zpráv (trigger níž). Druhý rodič
--  tak o změně ví hned a záznam o ní zůstane.
--
--  Spustit lze opakovaně.
-- ═══════════════════════════════════════════════════════════════════

-- ── Dva rodiče? ───────────────────────────────────────────────────
create or replace function ma_dva_rodice(target_family uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select count(distinct user_id) >= 2
  from family_members
  where family_id = target_family
    and custody_side is not null
    and role in ('owner', 'parent');
$$;

-- Jméno člena tak, jak ho vidí rodina.
create or replace function jmeno_clena(target_family uuid, uzivatel uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(nullif(btrim(fm.display_name), ''), nullif(btrim(p.full_name), ''), 'Člen rodiny')
  from family_members fm
  left join profiles p on p.id = fm.user_id
  where fm.family_id = target_family and fm.user_id = uzivatel
  limit 1;
$$;

-- Jméno rodiče na dané straně péče. Ve větách se píše „u: Jana",
-- protože skloňovat jména automaticky by dělalo chyby.
create or replace function jmeno_strany(target_family uuid, strana custody_side)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select coalesce(nullif(btrim(fm.display_name), ''), nullif(btrim(p.full_name), ''))
     from family_members fm
     left join profiles p on p.id = fm.user_id
     where fm.family_id = target_family and fm.custody_side = strana
       and fm.role in ('owner', 'parent')
     order by fm.created_at
     limit 1),
    case strana when 'a' then 'rodič A' else 'rodič B' end
  );
$$;

-- „6. 11." nebo „6. 11.–8. 11."
create or replace function rozsah_dnu(od date, do_dne date)
returns text
language sql
immutable
as $$
  select case when od = do_dne
    then to_char(od, 'FMDD. FMMM.')
    else to_char(od, 'FMDD. FMMM.') || '–' || to_char(do_dne, 'FMDD. FMMM.')
  end;
$$;

-- ── Tabulka ───────────────────────────────────────────────────────
create table if not exists zadosti_zmeny (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references families (id) on delete cascade,
  -- NULL = všechny děti
  child_id       uuid references children (id) on delete cascade,
  od             date not null,
  do_dne         date not null,
  -- U koho mají děti v těch dnech být.
  strana         custody_side not null,
  duvod          text check (duvod is null or char_length(duvod) <= 1000),

  navrhl         uuid references profiles (id) on delete set null,
  navrhl_jmeno   text not null,
  -- Do kdy se má druhý rodič vyjádřit. Mlčení NENÍ souhlas — bez
  -- odpovědi se nic nemění a žádost zůstává viset jako nevyřízená.
  odpovedet_do   date not null,

  stav           text not null default 'ceka'
                 check (stav in ('ceka', 'schvaleno', 'zamitnuto', 'zruseno')),
  odpovedel      uuid references profiles (id) on delete set null,
  odpoved        text check (odpoved is null or char_length(odpoved) <= 1000),
  vyrizeno_at    timestamptz,
  created_at     timestamptz not null default now(),

  check (do_dne >= od),
  -- Dva měsíce stačí na prázdniny; delší změna je změna vzoru.
  check (do_dne - od <= 62)
);

create index if not exists zadosti_zmeny_rodina_idx on zadosti_zmeny (family_id, stav, od);

alter table zadosti_zmeny enable row level security;

-- Číst smí každý člen rodiny. Zapisovat nikdo přímo — jen přes funkce
-- níž, které hlídají, kdo co smí.
drop policy if exists zadosti_zmeny_select on zadosti_zmeny;
create policy zadosti_zmeny_select on zadosti_zmeny
  for select using (is_family_member(family_id));

-- ── Přímý zápis do kalendáře jen tam, kde není druhý rodič ─────────
drop policy if exists custody_overrides_insert on custody_overrides;
create policy custody_overrides_insert on custody_overrides
  for insert with check (can_edit_family(family_id) and not ma_dva_rodice(family_id));

drop policy if exists custody_overrides_update on custody_overrides;
create policy custody_overrides_update on custody_overrides
  for update using (can_edit_family(family_id) and not ma_dva_rodice(family_id))
  with check (can_edit_family(family_id) and not ma_dva_rodice(family_id));

drop policy if exists custody_overrides_delete on custody_overrides;
create policy custody_overrides_delete on custody_overrides
  for delete using (can_edit_family(family_id) and not ma_dva_rodice(family_id));

-- ── Zpráva do historie ────────────────────────────────────────────
create or replace function zapis_zpravu_zmeny(target_family uuid, autor uuid, text_zpravy text, den date)
returns void
language sql
security definer
set search_path = public
as $$
  insert into zpravy (family_id, autor, autor_jmeno, text, den)
  values (target_family, autor, jmeno_clena(target_family, autor), text_zpravy, den);
$$;

-- ── Návrh ─────────────────────────────────────────────────────────
create or replace function navrhni_zmenu(
  target_family uuid,
  dite uuid,
  od date,
  do_dne date,
  strana custody_side,
  duvod text,
  odpovedet_do date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  nova uuid;
  jmeno_ditete text;
begin
  if auth.uid() is null or not can_edit_family(target_family) then
    raise exception 'Změnu rozvrhu teď navrhnout nemůžete.';
  end if;
  if od < current_date then
    raise exception 'Změnu nejde navrhnout zpětně.';
  end if;
  if odpovedet_do < current_date or odpovedet_do > od then
    raise exception 'Termín odpovědi musí být mezi dneškem a prvním dnem změny.';
  end if;
  if dite is not null and not exists (
    select 1 from children where id = dite and family_id = target_family
  ) then
    raise exception 'Dítě do rodiny nepatří.';
  end if;

  insert into zadosti_zmeny (family_id, child_id, od, do_dne, strana, duvod, navrhl, navrhl_jmeno, odpovedet_do)
  values (target_family, dite, od, do_dne, strana, nullif(btrim(duvod), ''), auth.uid(),
          jmeno_clena(target_family, auth.uid()), odpovedet_do)
  returning id into nova;

  select name into jmeno_ditete from children where id = dite;

  perform zapis_zpravu_zmeny(
    target_family, auth.uid(),
    'Navrhuji změnu rozvrhu: ' || rozsah_dnu(od, do_dne)
      || coalesce(' (' || jmeno_ditete || ')', '')
      || ' u: ' || jmeno_strany(target_family, strana) || '.'
      || coalesce(' Důvod: ' || nullif(btrim(duvod), '') || '.', '')
      || ' Odpověď prosím do ' || to_char(odpovedet_do, 'FMDD. FMMM.') || ' v Kalendáři.',
    od
  );

  return nova;
end;
$$;

-- ── Odpověď ───────────────────────────────────────────────────────
create or replace function odpovez_na_zadost(zadost uuid, schvalit boolean, text_odpovedi text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  z zadosti_zmeny%rowtype;
  d date;
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
  if schvalit and z.do_dne < current_date then
    raise exception 'Změna už proběhla, schválit ji nejde.';
  end if;

  update zadosti_zmeny
  set stav = case when schvalit then 'schvaleno' else 'zamitnuto' end,
      odpovedel = auth.uid(),
      odpoved = nullif(btrim(text_odpovedi), ''),
      vyrizeno_at = now()
  where id = z.id;

  if schvalit then
    -- Po schválení se změna propíše do kalendáře. Funkce běží s právy
    -- vlastníka, takže ji politika „jen bez druhého rodiče" nezastaví —
    -- právě proto, že souhlas druhého rodiče teď je.
    d := greatest(z.od, current_date);
    while d <= z.do_dne loop
      delete from custody_overrides
      where family_id = z.family_id and day = d
        and coalesce(child_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = coalesce(z.child_id, '00000000-0000-0000-0000-000000000000'::uuid);
      insert into custody_overrides (family_id, child_id, day, side, reason, created_by)
      values (z.family_id, z.child_id, d, z.strana,
              coalesce('Schválená změna: ' || z.duvod, 'Schválená změna rozvrhu'), z.navrhl);
      d := d + 1;
    end loop;
  end if;

  perform zapis_zpravu_zmeny(
    z.family_id, auth.uid(),
    case when schvalit then 'Souhlasím se změnou rozvrhu ' else 'Nesouhlasím se změnou rozvrhu ' end
      || rozsah_dnu(z.od, z.do_dne) || ' u: ' || jmeno_strany(z.family_id, z.strana) || '.'
      || coalesce(' ' || nullif(btrim(text_odpovedi), ''), ''),
    z.od
  );
end;
$$;

-- ── Zrušení vlastního návrhu ──────────────────────────────────────
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
    'Ruším svůj návrh změny rozvrhu ' || rozsah_dnu(z.od, z.do_dne) || '.',
    z.od
  );
end;
$$;

grant execute on function navrhni_zmenu(uuid, uuid, date, date, custody_side, text, date) to authenticated;
grant execute on function odpovez_na_zadost(uuid, boolean, text) to authenticated;
grant execute on function zrus_zadost(uuid) to authenticated;
grant execute on function ma_dva_rodice(uuid) to authenticated;

-- Pomocné funkce nemá nikdo volat napřímo.
revoke execute on function zapis_zpravu_zmeny(uuid, uuid, text, date) from public, anon, authenticated;

-- ── Změna vzoru střídání se zapíše do Zpráv ────────────────────────
create or replace function zapis_zmenu_vzoru()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rodina uuid := coalesce(new.family_id, old.family_id);
  co text;
begin
  -- Jen když je komu to oznamovat a ví se, kdo to udělal. Servisní
  -- skripty (bez přihlášeného uživatele) se nezapisují.
  if auth.uid() is null or not ma_dva_rodice(rodina) then
    return coalesce(new, old);
  end if;
  -- Mazání celé rodiny maže kaskádou i vzory; zpráva do rodiny, která
  -- už neexistuje, by smazání shodila.
  if not exists (select 1 from families where id = rodina) then
    return coalesce(new, old);
  end if;

  co := case tg_op
    when 'INSERT' then 'Změna vzoru střídání: nový vzor platný od ' || to_char(new.starts_on, 'FMDD. FMMM. YYYY') || '.'
    when 'DELETE' then 'Změna vzoru střídání: smazán vzor platný od ' || to_char(old.starts_on, 'FMDD. FMMM. YYYY') || '.'
    else 'Změna vzoru střídání: upraven vzor platný od ' || to_char(new.starts_on, 'FMDD. FMMM. YYYY') || '.'
  end;

  perform zapis_zpravu_zmeny(rodina, auth.uid(), co, null);
  return coalesce(new, old);
end;
$$;

drop trigger if exists vzor_strida_do_zprav on custody_patterns;
create trigger vzor_strida_do_zprav
  after insert or update or delete on custody_patterns
  for each row execute function zapis_zmenu_vzoru();
