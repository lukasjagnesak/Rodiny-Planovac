-- ═══════════════════════════════════════════════════════════════════
--  Žádost o proplacení výdaje.
--
--  Rodič, který výdaj zaplatil, požádá druhého o jeho podíl. Druhý ho
--  schválí, nebo rozporuje s důvodem. Po schválení a zaplacení potvrdí
--  příjem ten, komu se platilo, a teprve tím je výdaj vypořádaný —
--  potvrzení od toho, kdo dostal peníze, se nedá zpochybnit.
--
--  Peníze aplikace nepřevádí. Jde o záznam: kdo o co požádal, kdy a jak
--  druhý odpověděl. Všechno se píše do Zpráv (nejdou smazat), takže to
--  končí i ve výpisu pro soud.
--
--  Částka se zapíše při žádosti (podíl podle `split_percent`) a výdaj
--  s živou žádostí nejde přepsat — jinak by se schvalovalo něco jiného,
--  než co pak platí.
--
--  Spustit lze opakovaně.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists zadosti_proplaceni (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references families (id) on delete cascade,
  expense_id     uuid not null references expenses (id) on delete cascade,
  pozadal        uuid references profiles (id) on delete set null,
  pozadal_jmeno  text not null,
  castka         numeric(12, 2) not null check (castka > 0),
  poznamka       text check (poznamka is null or char_length(poznamka) <= 1000),
  stav           text not null default 'ceka'
                 check (stav in ('ceka', 'schvaleno', 'rozporovano', 'zaplaceno', 'zruseno')),
  odpovedel      uuid references profiles (id) on delete set null,
  odpovedel_jmeno text,
  duvod          text check (duvod is null or char_length(duvod) <= 1000),
  odpovezeno_at  timestamptz,
  zaplaceno_at   timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists zadosti_proplaceni_rodina_idx on zadosti_proplaceni (family_id, created_at desc);
create index if not exists zadosti_proplaceni_vydaj_idx on zadosti_proplaceni (expense_id);
-- Na jeden výdaj nanejvýš jedna živá žádost.
create unique index if not exists zadosti_proplaceni_ziva_idx on zadosti_proplaceni (expense_id)
  where stav in ('ceka', 'schvaleno');

alter table zadosti_proplaceni enable row level security;

-- Číst smí rodina; zapisuje se jen přes funkce níž.
drop policy if exists zadosti_proplaceni_select on zadosti_proplaceni;
create policy zadosti_proplaceni_select on zadosti_proplaceni
  for select using (is_family_member(family_id));

revoke insert, update, delete on zadosti_proplaceni from anon, authenticated;
grant select on zadosti_proplaceni to authenticated;

-- Částka na haléře, ne zaokrouhlená: „1 234,50 Kč".
create or replace function castka_presne(c numeric)
returns text
language sql
immutable
as $$
  select case
    when c = trunc(c) then castka_kc(c)
    else replace(replace(to_char(c, 'FM999,999,999,990.00'), ',', ' '), '.', ',') || ' Kč'
  end;
$$;

-- ── Žádost ────────────────────────────────────────────────────────
create or replace function pozadej_o_proplaceni(vydaj uuid, poznamka text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  e expenses%rowtype;
  podil numeric;
  nova uuid;
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

  insert into zadosti_proplaceni (family_id, expense_id, pozadal, pozadal_jmeno, castka, poznamka)
  values (e.family_id, e.id, auth.uid(), jmeno_clena(e.family_id, auth.uid()), podil,
          nullif(btrim(poznamka), ''))
  returning id into nova;

  insert into zpravy (family_id, autor, autor_jmeno, text, expense_id)
  values (e.family_id, auth.uid(), jmeno_clena(e.family_id, auth.uid()),
    'Žádám o proplacení: ' || e.title || ' ze dne ' || to_char(e.spent_on, 'FMDD. FMMM. YYYY')
      || ', celkem ' || castka_presne(e.amount) || ', podíl k proplacení ' || castka_presne(podil)
      || ' (' || trim(trailing '.' from trim(trailing '0' from e.split_percent::text)) || ' %).'
      || coalesce(' ' || nullif(btrim(poznamka), ''), ''),
    e.id);

  return nova;
end;
$$;

-- ── Odpověď: schválit, nebo rozporovat ────────────────────────────
create or replace function odpovez_na_proplaceni(zadost uuid, schvalit boolean, duvod text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  z zadosti_proplaceni%rowtype;
  e expenses%rowtype;
  jmeno text;
begin
  select * into z from zadosti_proplaceni where id = zadost for update;
  if z.id is null then
    raise exception 'Žádost neexistuje.';
  end if;
  if auth.uid() is null or not je_rodic(z.family_id) then
    raise exception 'Na žádost odpovídá rodič.';
  end if;
  if z.pozadal = auth.uid() then
    raise exception 'Vlastní žádost schválit ani rozporovat nejde.';
  end if;
  if z.stav <> 'ceka' then
    raise exception 'Na žádost už někdo odpověděl.';
  end if;
  if not schvalit and nullif(btrim(duvod), '') is null then
    raise exception 'Napište, s čím nesouhlasíte.';
  end if;

  select * into e from expenses where id = z.expense_id;
  jmeno := jmeno_clena(z.family_id, auth.uid());

  update zadosti_proplaceni
  set stav = case when schvalit then 'schvaleno' else 'rozporovano' end,
      odpovedel = auth.uid(),
      odpovedel_jmeno = jmeno,
      duvod = nullif(btrim(odpovez_na_proplaceni.duvod), ''),
      odpovezeno_at = now()
  where id = z.id;

  insert into zpravy (family_id, autor, autor_jmeno, text, expense_id)
  values (z.family_id, auth.uid(), jmeno,
    case when schvalit
      then 'Schvaluji proplacení: ' || e.title || ', ' || castka_presne(z.castka) || '.'
      else 'Rozporuji proplacení: ' || e.title || ', ' || castka_presne(z.castka) || '. Důvod: ' || btrim(duvod)
    end,
    z.expense_id);
end;
$$;

-- ── Zrušení ───────────────────────────────────────────────────────
-- Žadatel smí zrušit čekající i rozporovanou žádost (třeba aby výdaj
-- opravil a požádal znovu). Schválenou ne — ta už je dohoda.
create or replace function zrus_proplaceni(zadost uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  z zadosti_proplaceni%rowtype;
  nazev text;
begin
  select * into z from zadosti_proplaceni where id = zadost for update;
  if z.id is null then
    raise exception 'Žádost neexistuje.';
  end if;
  if auth.uid() is null or z.pozadal is distinct from auth.uid() then
    raise exception 'Žádost ruší ten, kdo ji podal.';
  end if;
  if z.stav not in ('ceka', 'rozporovano') then
    raise exception 'Schválenou nebo zaplacenou žádost zrušit nejde.';
  end if;

  update zadosti_proplaceni set stav = 'zruseno' where id = z.id;
  select title into nazev from expenses where id = z.expense_id;

  insert into zpravy (family_id, autor, autor_jmeno, text, expense_id)
  values (z.family_id, auth.uid(), jmeno_clena(z.family_id, auth.uid()),
    'Ruším žádost o proplacení: ' || coalesce(nazev, 'výdaj') || ', ' || castka_presne(z.castka) || '.',
    z.expense_id);
end;
$$;

-- ── Výdaj s živou žádostí se nemění ───────────────────────────────
-- Částka, podíl, plátce ani vypořádání. Smazat výdaj taky nejde —
-- žádost by zmizela s ním (kaskáda) a s ní i to, o čem se jednalo.
create or replace function hlidej_vydaj_s_zadosti()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r expenses%rowtype := coalesce(old, new);
begin
  -- Mazání celé rodiny maže kaskádou i výdaje.
  if tg_op = 'DELETE' and not exists (select 1 from families where id = r.family_id) then
    return old;
  end if;
  if not exists (select 1 from zadosti_proplaceni where expense_id = r.id and stav in ('ceka', 'schvaleno')) then
    return coalesce(new, old);
  end if;
  if tg_op = 'DELETE' then
    raise exception 'Na výdaj běží žádost o proplacení. Nejdřív ji zrušte.';
  end if;
  -- Vypořádání nastavuje potvrd_proplaceni; to se pustí.
  if new.amount <> old.amount or new.split_percent <> old.split_percent
     or new.paid_by is distinct from old.paid_by or new.currency <> old.currency then
    raise exception 'Na výdaj běží žádost o proplacení. Nejdřív ji zrušte, pak výdaj upravte.';
  end if;
  if new.settled <> old.settled and coalesce(current_setting('klidoo.potvrzeni', true), '') <> 'ano' then
    raise exception 'Vypořádání výdaje s žádostí potvrzuje ten, kdo o proplacení žádal.';
  end if;
  return new;
end;
$$;

drop trigger if exists hlidej_vydaj_s_zadosti_trg on expenses;
create trigger hlidej_vydaj_s_zadosti_trg before update or delete on expenses
  for each row execute function hlidej_vydaj_s_zadosti();

-- ── Potvrzení příjmu ──────────────────────────────────────────────
-- Potvrzuje ten, kdo o peníze žádal: on ví, jestli přišly. Nastaví
-- příznak, aby hlídač výdaje vypořádání pustil.
create or replace function potvrd_proplaceni(zadost uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  z zadosti_proplaceni%rowtype;
  e expenses%rowtype;
begin
  select * into z from zadosti_proplaceni where id = zadost for update;
  if z.id is null then
    raise exception 'Žádost neexistuje.';
  end if;
  if auth.uid() is null or z.pozadal is distinct from auth.uid() then
    raise exception 'Příjem peněz potvrzuje ten, kdo o proplacení žádal.';
  end if;
  if z.stav <> 'schvaleno' then
    raise exception 'Potvrdit jde jen schválenou žádost.';
  end if;

  perform set_config('klidoo.potvrzeni', 'ano', true);
  update expenses set settled = true where id = z.expense_id returning * into e;
  perform set_config('klidoo.potvrzeni', '', true);
  update zadosti_proplaceni set stav = 'zaplaceno', zaplaceno_at = now() where id = z.id;

  insert into zpravy (family_id, autor, autor_jmeno, text, expense_id)
  values (z.family_id, auth.uid(), jmeno_clena(z.family_id, auth.uid()),
    'Potvrzuji, že mi přišlo ' || castka_presne(z.castka) || ' za výdaj „' || e.title || '“. Výdaj je vypořádaný.',
    z.expense_id);
end;
$$;

-- ── Historie ──────────────────────────────────────────────────────
create or replace function historie_proplaceni()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  nazev text;
begin
  if tg_op = 'UPDATE' and new.stav = old.stav then
    return new;
  end if;
  select title into nazev from expenses where id = new.expense_id;
  perform zapis_historii(
    new.family_id, 'vydaje',
    case new.stav
      when 'ceka' then 'Žádost o proplacení: '
      when 'schvaleno' then 'Schváleno proplacení: '
      when 'rozporovano' then 'Rozporováno proplacení: '
      when 'zaplaceno' then 'Potvrzen příjem proplacení: '
      else 'Zrušena žádost o proplacení: '
    end || coalesce(nazev, 'výdaj') || ', ' || castka_presne(new.castka),
    new.expense_id
  );
  return new;
end;
$$;

drop trigger if exists historie_trg on zadosti_proplaceni;
create trigger historie_trg after insert or update on zadosti_proplaceni
  for each row execute function historie_proplaceni();

grant execute on function pozadej_o_proplaceni(uuid, text) to authenticated;
grant execute on function odpovez_na_proplaceni(uuid, boolean, text) to authenticated;
grant execute on function potvrd_proplaceni(uuid) to authenticated;
grant execute on function zrus_proplaceni(uuid) to authenticated;
