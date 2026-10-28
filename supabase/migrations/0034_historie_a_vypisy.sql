-- ═══════════════════════════════════════════════════════════════════
--  Historie změn a ověřitelné výpisy.
--
--  HISTORIE: kdo, kdy a co změnil v rozvrhu, výdajích, událostech,
--  kroužcích, dětech a členech rodiny — a kdo si stáhl výpis. Zapisují
--  ji triggery v databázi, ne aplikace, takže ji nejde obejít jiným
--  klientem. Záznamy nejdou upravit ani smazat a vidí je oba rodiče.
--  To je jádro „záznamu, kterému soud věří": nikdo nic nepřepíše tiše.
--
--  VÝPISY: každý vytvořený výpis (komunikace, historie, souhrn) dostane
--  kód. Podle kódu se na klidoo.cz/overit ověří, že výpis vznikl v Klidoo,
--  kdy, kdo ho vytvořil a co obsahoval; u souboru i to, že ho nikdo
--  neupravil (otisk SHA-256). Zapisuje jen server servisním klíčem —
--  kdyby šlo zapisovat z prohlížeče, šlo by si „ověřit" i podvrh.
--
--  Spustit lze opakovaně.
-- ═══════════════════════════════════════════════════════════════════

-- ── Historie ──────────────────────────────────────────────────────
create table if not exists historie (
  id         bigserial primary key,
  family_id  uuid not null references families (id) on delete cascade,
  -- Jméno zůstává i po smazání účtu. Historie, ze které se po odchodu
  -- jedné strany stane „někdo něco změnil", není historie.
  kdo        uuid references profiles (id) on delete set null,
  kdo_jmeno  text not null,
  kdy        timestamptz not null default now(),
  oblast     text not null
             check (oblast in ('rozvrh', 'vydaje', 'udalosti', 'krouzky', 'deti', 'clenove', 'vypisy')),
  popis      text not null,
  zaznam_id  uuid
);

create index if not exists historie_rodina_idx on historie (family_id, kdy desc);

alter table historie enable row level security;

drop policy if exists historie_select on historie;
create policy historie_select on historie
  for select using (is_family_member(family_id));
-- ŽÁDNÁ politika pro insert, update ani delete. Zapisují jen triggery
-- a server; měnit a mazat nesmí nikdo.

-- Částka „1 890 Kč".
create or replace function castka_kc(c numeric)
returns text
language sql
immutable
as $$ select replace(to_char(round(c), 'FM999,999,999,990'), ',', ' ') || ' Kč' $$;

create or replace function zapis_historii(rodina uuid, oblast text, popis text, zaznam uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Mazání celé rodiny maže kaskádou všechno; zápis do rodiny, která
  -- už neexistuje, by mazání shodil.
  if not exists (select 1 from families where id = rodina) then
    return;
  end if;
  insert into historie (family_id, kdo, kdo_jmeno, oblast, popis, zaznam_id)
  values (
    rodina,
    auth.uid(),
    case when auth.uid() is null then 'Klidoo (automaticky)'
         else coalesce(jmeno_clena(rodina, auth.uid()), 'Člen rodiny') end,
    oblast, popis, zaznam
  );
end;
$$;

revoke execute on function zapis_historii(uuid, text, text, uuid) from public, anon, authenticated;

-- ── Triggery ──────────────────────────────────────────────────────
create or replace function historie_vyjimky()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r custody_overrides%rowtype := coalesce(new, old);
  dite text;
begin
  select name into dite from children where id = r.child_id;
  perform zapis_historii(
    r.family_id, 'rozvrh',
    case tg_op
      when 'DELETE' then 'Zrušena výjimka v rozvrhu: ' || to_char(old.day, 'FMDD. FMMM. YYYY')
      else 'Výjimka v rozvrhu: ' || to_char(new.day, 'FMDD. FMMM. YYYY')
           || ' u: ' || jmeno_strany(new.family_id, new.side)
    end || coalesce(' (' || dite || ')', ''),
    r.id
  );
  return r;
end;
$$;

create or replace function historie_vzoru()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r custody_patterns%rowtype := coalesce(new, old);
begin
  perform zapis_historii(
    r.family_id, 'rozvrh',
    case tg_op when 'INSERT' then 'Nový vzor střídání' when 'DELETE' then 'Smazán vzor střídání'
      else 'Upraven vzor střídání' end
      || ' platný od ' || to_char(r.starts_on, 'FMDD. FMMM. YYYY'),
    r.id
  );
  return r;
end;
$$;

create or replace function historie_vydaje()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r expenses%rowtype := coalesce(new, old);
  co text;
begin
  if tg_op = 'INSERT' then
    co := 'Výdaj: ' || new.title || ', ' || castka_kc(new.amount)
          || ' (' || to_char(new.spent_on, 'FMDD. FMMM. YYYY') || ')';
  elsif tg_op = 'DELETE' then
    co := 'Smazán výdaj: ' || old.title || ', ' || castka_kc(old.amount);
  elsif new.settled is distinct from old.settled
        and new.amount = old.amount and new.title = old.title then
    co := 'Výdaj ' || new.title || ' označen jako ' || case when new.settled then 'vyrovnaný' else 'nevyrovnaný' end;
  elsif new.amount <> old.amount then
    co := 'Upraven výdaj: ' || new.title || ', ' || castka_kc(old.amount) || ' → ' || castka_kc(new.amount);
  else
    co := 'Upraven výdaj: ' || new.title || ', ' || castka_kc(new.amount);
  end if;
  perform zapis_historii(r.family_id, 'vydaje', co, r.id);
  return r;
end;
$$;

create or replace function historie_udalosti()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r events%rowtype := coalesce(new, old);
begin
  perform zapis_historii(
    r.family_id, 'udalosti',
    case tg_op when 'INSERT' then 'Událost: ' when 'DELETE' then 'Smazána událost: ' else 'Upravena událost: ' end
      || r.title || ' (' || to_char(r.starts_at at time zone 'Europe/Prague', 'FMDD. FMMM. YYYY') || ')',
    r.id
  );
  return r;
end;
$$;

create or replace function historie_krouzku()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r activities%rowtype := coalesce(new, old);
begin
  perform zapis_historii(
    r.family_id, 'krouzky',
    case tg_op when 'INSERT' then 'Nový kroužek: ' when 'DELETE' then 'Smazán kroužek: ' else 'Upraven kroužek: ' end
      || r.name,
    r.id
  );
  return r;
end;
$$;

create or replace function historie_deti()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r children%rowtype := coalesce(new, old);
begin
  if tg_op = 'UPDATE' and new.name = old.name and new.archived = old.archived then
    return r; -- škola, třída, poznámky: provoz, ne historie
  end if;
  perform zapis_historii(
    r.family_id, 'deti',
    case
      when tg_op = 'INSERT' then 'Přidáno dítě: ' || new.name
      when tg_op = 'DELETE' then 'Odebráno dítě: ' || old.name
      when new.archived and not old.archived then 'Dítě skryto: ' || new.name
      when old.name <> new.name then 'Změněno jméno dítěte: ' || old.name || ' → ' || new.name
      else 'Dítě znovu zobrazeno: ' || new.name
    end,
    r.id
  );
  return r;
end;
$$;

create or replace function historie_clenu()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r family_members%rowtype := coalesce(new, old);
  jmeno text;
begin
  if tg_op = 'UPDATE' and new.role = old.role and new.custody_side is not distinct from old.custody_side then
    return r;
  end if;
  select coalesce(nullif(btrim(r.display_name), ''), nullif(btrim(p.full_name), ''), 'člen')
    into jmeno from profiles p where p.id = r.user_id;
  perform zapis_historii(
    r.family_id, 'clenove',
    case tg_op when 'INSERT' then 'Nový člen rodiny: ' when 'DELETE' then 'Odebrán člen rodiny: '
      else 'Změněna role člena rodiny: ' end || coalesce(jmeno, 'člen'),
    r.id
  );
  return r;
end;
$$;

drop trigger if exists historie_trg on custody_overrides;
create trigger historie_trg after insert or update or delete on custody_overrides
  for each row execute function historie_vyjimky();
drop trigger if exists historie_trg on custody_patterns;
create trigger historie_trg after insert or update or delete on custody_patterns
  for each row execute function historie_vzoru();
drop trigger if exists historie_trg on expenses;
create trigger historie_trg after insert or update or delete on expenses
  for each row execute function historie_vydaje();
drop trigger if exists historie_trg on events;
create trigger historie_trg after insert or update or delete on events
  for each row execute function historie_udalosti();
drop trigger if exists historie_trg on activities;
create trigger historie_trg after insert or update or delete on activities
  for each row execute function historie_krouzku();
drop trigger if exists historie_trg on children;
create trigger historie_trg after insert or update or delete on children
  for each row execute function historie_deti();
drop trigger if exists historie_trg on family_members;
create trigger historie_trg after insert or update or delete on family_members
  for each row execute function historie_clenu();

-- ── Výpisy s ověřením ─────────────────────────────────────────────
create table if not exists vypisy (
  id              uuid primary key default gen_random_uuid(),
  -- Kód na výpisu, např. „K7F3-9QX2". Bez 0/O/1/I, ať se nedá splést.
  kod             text not null unique,
  family_id       uuid not null references families (id) on delete cascade,
  druh            text not null check (druh in ('komunikace', 'historie', 'souhrn')),
  vytvoril        uuid references profiles (id) on delete set null,
  vytvoril_jmeno  text not null,
  vytvoreno       timestamptz not null default now(),
  obdobi_od       date,
  obdobi_do       date,
  -- SHA-256 souboru (hex). U souhrnu, který se tiskne z prohlížeče,
  -- prázdné — ověřuje se podle čísel v `shrnuti`.
  otisk           text,
  -- Co výpis obsahoval: počty zpráv, noci, částky. Ukáže se při ověření,
  -- aby šlo porovnat i vytištěnou kopii.
  shrnuti         jsonb not null default '{}'::jsonb
);

create index if not exists vypisy_rodina_idx on vypisy (family_id, vytvoreno desc);

alter table vypisy enable row level security;

drop policy if exists vypisy_select on vypisy;
create policy vypisy_select on vypisy
  for select using (is_family_member(family_id));
-- Zapisuje jen server servisním klíčem. Žádné politiky pro zápis.
