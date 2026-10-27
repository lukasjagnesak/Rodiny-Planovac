-- ═══════════════════════════════════════════════════════════════════
--  Přístup pro profesionály: advokát, mediátor, OSPOD, soud — jen ke čtení.
--
--  Udělit ho smí kterýkoli z rodičů (ne jen správce rodiny). Druhý rodič
--  se to dozví hned — zpráva ve Zprávách (nejde smazat) a záznam
--  v historii — a přístup smí kdykoli odebrat. Přístup může mít datum
--  konce; po něm profesionál do rodiny nevidí, aniž by ho někdo musel
--  odebírat.
--
--  Pozvánku profesionála jde přijmout jen z e-mailu, na který byla
--  poslaná. Profesionál vidí zprávy a doklady — odkaz, který by se
--  přeposlal, nesmí stačit.
--
--  Opravuje i to, že nevyřízené pozvánky (s odkazem) viděl každý člen
--  rodiny včetně role „jen ke čtení". Viewer by pak mohl použít pozvánku
--  pro rodiče a připojit se jako rodič. Teď je vidí jen rodiče a pečující.
--
--  A zavírá díru, kterou měla politika `family_members_update` od
--  začátku: člen směl upravit svůj řádek celý, takže si „jen ke čtení"
--  mohl přepsat roli na správce. Teď si člen sám mění jen jméno, barvu
--  a stranu (profesionál ani tu ne); roli a přístup mění správce.
--
--  Spustit lze opakovaně.
-- ═══════════════════════════════════════════════════════════════════

alter table family_members add column if not exists profese text;
alter table family_members add column if not exists pristup_do date;
alter table family_members add column if not exists udelil uuid references profiles (id) on delete set null;
alter table family_invites add column if not exists profese text;
alter table family_invites add column if not exists pristup_do date;

alter table family_members drop constraint if exists family_members_profese_check;
alter table family_members add constraint family_members_profese_check
  check (profese is null or profese in ('advokat', 'mediator', 'ospod', 'soud', 'jiny'));
alter table family_invites drop constraint if exists family_invites_profese_check;
alter table family_invites add constraint family_invites_profese_check
  check (profese is null or profese in ('advokat', 'mediator', 'ospod', 'soud', 'jiny'));

create or replace function nazev_profese(p text)
returns text
language sql
immutable
as $$
  select case p
    when 'advokat' then 'advokát/ka'
    when 'mediator' then 'mediátor/ka'
    when 'ospod' then 'OSPOD'
    when 'soud' then 'soud'
    when 'jiny' then 'profesionál'
  end;
$$;

-- ── Členství s datem konce ────────────────────────────────────────
-- Po `pristup_do` člen do rodiny nevidí. Týká se jen profesionálů —
-- rodičům se datum nenastavuje.
create or replace function is_family_member(target_family uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from family_members
    where family_id = target_family
      and user_id = auth.uid()
      and (pristup_do is null or pristup_do >= current_date)
  );
$$;

-- Totéž pro seznam rodin (z něj se řídí, čí profily člověk vidí).
create or replace function my_family_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select family_id from family_members
  where user_id = auth.uid()
    and (pristup_do is null or pristup_do >= current_date);
$$;

-- Rodič: člen s rolí owner nebo parent (ne pečující, ne jen ke čtení).
create or replace function je_rodic(target_family uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from family_members
    where family_id = target_family
      and user_id = auth.uid()
      and role in ('owner', 'parent')
  );
$$;

-- ── Co si člen smí změnit sám ─────────────────────────────────────
-- Bez přihlášeného uživatele (service role) se nehlídá — tak převádí
-- správcovství mazání účtu.
create or replace function hlidej_zmenu_clena()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or is_family_owner(old.family_id) then
    return new;
  end if;
  if new.family_id <> old.family_id or new.user_id <> old.user_id
     or new.role <> old.role
     or new.profese is distinct from old.profese
     or new.pristup_do is distinct from old.pristup_do
     or new.udelil is distinct from old.udelil then
    raise exception 'Roli a přístup člena mění správce rodiny.';
  end if;
  if old.profese is not null and new.custody_side is distinct from old.custody_side then
    raise exception 'Přístup jen ke čtení nemá stranu v kalendáři.';
  end if;
  return new;
end;
$$;

drop trigger if exists hlidej_zmenu_clena_trg on family_members;
create trigger hlidej_zmenu_clena_trg before update on family_members
  for each row execute function hlidej_zmenu_clena();

-- ── Pozvánky vidí jen rodiče a pečující ───────────────────────────
drop policy if exists family_invites_select on family_invites;
create policy family_invites_select on family_invites
  for select using (is_family_editor(family_id));

-- ── Pozvání profesionála ──────────────────────────────────────────
create or replace function pozvi_profesionala(
  target_family uuid,
  email text,
  profese text,
  pristup_do date
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
  adresa text := lower(btrim(email));
begin
  if auth.uid() is null or not je_rodic(target_family) then
    raise exception 'Přístup pro profesionály uděluje rodič.';
  end if;
  if adresa !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Zadejte platný e-mail.';
  end if;
  if profese is null or profese not in ('advokat', 'mediator', 'ospod', 'soud', 'jiny') then
    raise exception 'Vyberte, o koho jde.';
  end if;
  if pristup_do is not null and pristup_do < current_date then
    raise exception 'Datum konce přístupu je v minulosti.';
  end if;

  insert into family_invites (family_id, email, role, custody_side, invited_by, profese, pristup_do)
  values (target_family, adresa, 'viewer', null, auth.uid(), profese, pristup_do)
  returning token into t;

  perform zapis_zpravu_zmeny(
    target_family, auth.uid(),
    'Dávám přístup jen ke čtení: ' || adresa || ' (' || nazev_profese(profese) || ')'
      || coalesce(', do ' || to_char(pristup_do, 'FMDD. FMMM. YYYY'), ', bez data konce')
      || '. Uvidí kalendář, zprávy, výdaje a doklady, nic nemůže měnit. Přístup jde kdykoli odebrat v části Děti a rodina.',
    null
  );
  perform zapis_historii(target_family, 'clenove',
    'Pozvánka s přístupem jen ke čtení: ' || adresa || ' (' || nazev_profese(profese) || ')', null);

  return t;
end;
$$;

-- ── Přijetí pozvánky (nahrazuje verzi z 0002) ─────────────────────
create or replace function accept_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv family_invites%rowtype;
  muj_email text;
begin
  if auth.uid() is null then
    raise exception 'Není přihlášený uživatel';
  end if;

  select * into inv from family_invites
  where token = invite_token
    and accepted_at is null
    and expires_at > now();

  if inv.id is null then
    raise exception 'Pozvánka je neplatná nebo už vypršela';
  end if;

  -- Profesionál jen z e-mailu, na který pozvánka šla.
  if inv.profese is not null then
    select lower(email) into muj_email from auth.users where id = auth.uid();
    if muj_email is distinct from lower(inv.email) then
      raise exception 'Tahle pozvánka patří jinému e-mailu (%). Přihlaste se jím.', inv.email;
    end if;
  end if;

  insert into family_members (family_id, user_id, role, custody_side, profese, pristup_do, udelil)
  values (inv.family_id, auth.uid(), inv.role, inv.custody_side, inv.profese, inv.pristup_do, inv.invited_by)
  on conflict (family_id, user_id) do nothing;

  update family_invites set accepted_at = now() where id = inv.id;

  return inv.family_id;
end;
$$;

-- ── Odebrání přístupu ─────────────────────────────────────────────
-- Smí kterýkoli rodič — i ten, kdo přístup neuděloval. To je pointa:
-- druhý rodič nesmí být odkázaný na to, že ho ten první pustí.
create or replace function odeber_pristup(clen uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m family_members%rowtype;
  jmeno text;
begin
  select * into m from family_members where id = clen;
  if m.id is null then
    raise exception 'Člen neexistuje.';
  end if;
  if not je_rodic(m.family_id) then
    raise exception 'Přístup odebírá rodič.';
  end if;
  if m.role <> 'viewer' then
    raise exception 'Takhle jde odebrat jen přístup jen ke čtení.';
  end if;

  jmeno := jmeno_clena(m.family_id, m.user_id);
  delete from family_members where id = m.id;

  perform zapis_zpravu_zmeny(
    m.family_id, auth.uid(),
    'Odebírám přístup jen ke čtení: ' || coalesce(jmeno, 'člen') || coalesce(' (' || nazev_profese(m.profese) || ')', '') || '.',
    null
  );
end;
$$;

-- Zrušení nevyřízené pozvánky profesionála — také kterýkoli rodič.
create or replace function zrus_pozvanku(pozvanka uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inv family_invites%rowtype;
begin
  select * into inv from family_invites where id = pozvanka;
  if inv.id is null then
    raise exception 'Pozvánka neexistuje.';
  end if;
  if not (je_rodic(inv.family_id) or is_family_owner(inv.family_id)) then
    raise exception 'Pozvánku ruší rodič.';
  end if;
  delete from family_invites where id = inv.id;
  if inv.profese is not null then
    perform zapis_zpravu_zmeny(inv.family_id, auth.uid(),
      'Ruším pozvánku s přístupem jen ke čtení: ' || inv.email || ' (' || nazev_profese(inv.profese) || ').', null);
  end if;
end;
$$;

grant execute on function pozvi_profesionala(uuid, text, text, date) to authenticated;
grant execute on function odeber_pristup(uuid) to authenticated;
grant execute on function zrus_pozvanku(uuid) to authenticated;

-- ── Historie: profesionálové zvlášť ───────────────────────────────
create or replace function historie_clenu()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r family_members%rowtype := coalesce(new, old);
  jmeno text;
  kdo text;
begin
  if tg_op = 'UPDATE' and new.role = old.role and new.custody_side is not distinct from old.custody_side
     and new.pristup_do is not distinct from old.pristup_do then
    return r;
  end if;
  select coalesce(nullif(btrim(r.display_name), ''), nullif(btrim(p.full_name), ''), 'člen')
    into jmeno from profiles p where p.id = r.user_id;
  kdo := coalesce(jmeno, 'člen') || coalesce(' (' || nazev_profese(r.profese) || ')', '');

  perform zapis_historii(
    r.family_id, 'clenove',
    case
      when r.profese is not null and tg_op = 'INSERT' then
        'Přístup jen ke čtení: ' || kdo || coalesce(', do ' || to_char(r.pristup_do, 'FMDD. FMMM. YYYY'), '')
      when r.profese is not null and tg_op = 'DELETE' then 'Odebrán přístup jen ke čtení: ' || kdo
      when tg_op = 'INSERT' then 'Nový člen rodiny: ' || kdo
      when tg_op = 'DELETE' then 'Odebrán člen rodiny: ' || kdo
      else 'Změněna role nebo přístup člena rodiny: ' || kdo
    end,
    r.id
  );
  return r;
end;
$$;
