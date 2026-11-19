-- ═══════════════════════════════════════════════════════════════════
--  Číslo účtu u žádosti o proplacení — kvůli QR Platbě.
--
--  Rodič si účet uloží v profilu (vidí ho jen jeho rodina). Při žádosti
--  se účet zapíše i k žádosti samotné: pozdější změna profilu nesmí
--  změnit, kam se mělo platit. Ukládá se jako IBAN; databáze ověří
--  kontrolní součet, aby překlep neposlal peníze jinam.
--
--  QR kód se kreslí až v prohlížeči — účet ani částka nikam neodcházejí.
--
--  Spustit lze opakovaně.
-- ═══════════════════════════════════════════════════════════════════

create or replace function iban_platny(iban text)
returns boolean
language plpgsql
immutable
as $$
declare
  s text;
  zbytek int := 0;
  z text;
  c text;
begin
  if iban is null or iban !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$' then
    return false;
  end if;
  s := substr(iban, 5) || substr(iban, 1, 4);
  foreach z in array regexp_split_to_array(s, '') loop
    if z ~ '[A-Z]' then
      z := (ascii(z) - 55)::text;
    end if;
    foreach c in array regexp_split_to_array(z, '') loop
      zbytek := (zbytek * 10 + c::int) % 97;
    end loop;
  end loop;
  return zbytek = 1;
end;
$$;

-- Český tvar pro text zprávy: 19-2000145399/0800.
create or replace function ucet_cesky(iban text)
returns text
language sql
immutable
as $$
  select case
    when iban is null then null
    when iban ~ '^CZ[0-9]{22}$' then
      coalesce(nullif(ltrim(substr(iban, 9, 6), '0'), '') || '-', '')
        || ltrim(substr(iban, 15), '0') || '/' || substr(iban, 5, 4)
    else iban
  end;
$$;

alter table profiles add column if not exists ucet text;
alter table profiles drop constraint if exists profiles_ucet_check;
alter table profiles add constraint profiles_ucet_check check (ucet is null or iban_platny(ucet));

alter table zadosti_proplaceni add column if not exists ucet text;
alter table zadosti_proplaceni drop constraint if exists zadosti_proplaceni_ucet_check;
alter table zadosti_proplaceni add constraint zadosti_proplaceni_ucet_check
  check (ucet is null or iban_platny(ucet));

-- ── Žádost s účtem (nahrazuje verzi z 0036) ───────────────────────
drop function if exists pozadej_o_proplaceni(uuid, text);

create or replace function pozadej_o_proplaceni(
  vydaj uuid,
  poznamka text default null,
  ucet text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  e expenses%rowtype;
  podil numeric;
  nova uuid;
  cil text := nullif(upper(regexp_replace(coalesce(pozadej_o_proplaceni.ucet, ''), '\s', '', 'g')), '');
begin
  select * into e from expenses where id = vydaj;
  if e.id is null then
    raise exception 'Výdaj neexistuje.';
  end if;
  if auth.uid() is null or not can_edit_family(e.family_id) or not je_rodic(e.family_id) then
    raise exception 'O proplacení žádá rodič.';
  end if;
  if not ma_dva_rodice(e.family_id) then
    raise exception 'O proplacení jde žádat, až bude v rodině i druhý rodič.';
  end if;
  if e.paid_by is distinct from auth.uid() then
    raise exception 'O proplacení žádá ten, kdo výdaj zaplatil.';
  end if;
  if e.settled then
    raise exception 'Výdaj je už vypořádaný.';
  end if;
  podil := round(e.amount * e.split_percent / 100, 2);
  if podil <= 0 then
    raise exception 'Podíl druhého rodiče je u tohoto výdaje nulový.';
  end if;
  if exists (select 1 from zadosti_proplaceni where expense_id = e.id and stav in ('ceka', 'schvaleno')) then
    raise exception 'Na tenhle výdaj už žádost běží.';
  end if;

  -- Účet z žádosti, jinak z profilu. Bez účtu jde žádat taky.
  if cil is null then
    select p.ucet into cil from profiles p where p.id = auth.uid();
  end if;
  if cil is not null and not iban_platny(cil) then
    raise exception 'Číslo účtu nesedí. Zkontrolujte ho prosím.';
  end if;

  insert into zadosti_proplaceni (family_id, expense_id, pozadal, pozadal_jmeno, castka, poznamka, ucet)
  values (e.family_id, e.id, auth.uid(), jmeno_clena(e.family_id, auth.uid()), podil,
          nullif(btrim(poznamka), ''), cil)
  returning id into nova;

  insert into zpravy (family_id, autor, autor_jmeno, text, expense_id)
  values (e.family_id, auth.uid(), jmeno_clena(e.family_id, auth.uid()),
    'Žádám o proplacení: ' || e.title || ' ze dne ' || to_char(e.spent_on, 'FMDD. FMMM. YYYY')
      || ', celkem ' || castka_presne(e.amount) || ', podíl k proplacení ' || castka_presne(podil)
      || ' (' || trim(trailing '.' from trim(trailing '0' from e.split_percent::text)) || ' %).'
      || coalesce(' Na účet ' || ucet_cesky(cil) || '.', '')
      || coalesce(' ' || nullif(btrim(poznamka), ''), ''),
    e.id);

  return nova;
end;
$$;

grant execute on function pozadej_o_proplaceni(uuid, text, text) to authenticated;
