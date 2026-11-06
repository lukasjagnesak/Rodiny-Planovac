-- ═══════════════════════════════════════════════════════════════════
--  Nápady na dárky pro děti.
--
--  Rodiče (a pečující) píšou nápady k jednotlivým dětem. Kdo chce dárek
--  koupit, zamluví si ho — druhý hned vidí, že ho kupovat nemá, a dítě
--  nedostane dvakrát totéž. Po nákupu se dárek označí jako koupený
--  (volitelně i s výdajem) a po předání jako darovaný.
--
--  Pravidla, která drží databáze:
--  - zamluvit jde jen volný dárek a jen pro sebe; uvolnit jen vlastní,
--  - koupeno označuje jen ten, kdo dárek zamluvil,
--  - dárek zamluvený někým jiným nejde smazat — kupujícímu by zmizel
--    pod rukama.
--
--  Spustit lze opakovaně.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists darky (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families (id) on delete cascade,
  -- NULL = pro všechny děti (společný dárek)
  child_id      uuid references children (id) on delete cascade,
  nazev         text not null check (char_length(btrim(nazev)) between 1 and 200),
  odkaz         text check (odkaz is null or (odkaz ~* '^https?://' and char_length(odkaz) <= 1000)),
  cena          numeric(12, 2) check (cena is null or cena >= 0),
  prilezitost   text check (prilezitost is null or prilezitost in ('narozeniny', 'svatek', 'vanoce', 'jine')),
  poznamka      text check (poznamka is null or char_length(poznamka) <= 1000),
  pridal        uuid references profiles (id) on delete set null,
  pridal_jmeno  text not null default '',
  koupi         uuid references profiles (id) on delete set null,
  koupi_jmeno   text,
  koupeno_at    timestamptz,
  expense_id    uuid references expenses (id) on delete set null,
  darovano      boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists darky_rodina_idx on darky (family_id, darovano, created_at desc);
create index if not exists darky_dite_idx on darky (child_id);

alter table darky enable row level security;

drop policy if exists darky_select on darky;
create policy darky_select on darky
  for select using (is_family_member(family_id));

drop policy if exists darky_insert on darky;
create policy darky_insert on darky
  for insert with check (can_edit_family(family_id));

drop policy if exists darky_update on darky;
create policy darky_update on darky
  for update using (can_edit_family(family_id)) with check (can_edit_family(family_id));

drop policy if exists darky_delete on darky;
create policy darky_delete on darky
  for delete using (can_edit_family(family_id) and (koupi is null or koupi = auth.uid()));

grant select, insert, update, delete on darky to authenticated;

-- ── Kdo co smí ────────────────────────────────────────────────────
create or replace function hlidej_darek()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Servisní zásahy (bez přihlášeného uživatele) se nehlídají.
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.pridal := auth.uid();
    new.pridal_jmeno := coalesce(jmeno_clena(new.family_id, auth.uid()), '');
    new.koupi := null;
    new.koupi_jmeno := null;
    new.koupeno_at := null;
    new.darovano := false;
    if new.child_id is not null
       and not exists (select 1 from children where id = new.child_id and family_id = new.family_id) then
      raise exception 'Dítě nepatří do této rodiny.';
    end if;
    return new;
  end if;

  if new.family_id <> old.family_id or new.pridal is distinct from old.pridal
     or new.pridal_jmeno <> old.pridal_jmeno then
    raise exception 'Tohle u dárku měnit nejde.';
  end if;
  if new.child_id is distinct from old.child_id and new.child_id is not null
     and not exists (select 1 from children where id = new.child_id and family_id = new.family_id) then
    raise exception 'Dítě nepatří do této rodiny.';
  end if;

  -- Zamluvení: volný dárek jen pro sebe, uvolnit jen vlastní.
  if new.koupi is distinct from old.koupi then
    if old.koupi is null and new.koupi = auth.uid() then
      new.koupi_jmeno := jmeno_clena(new.family_id, auth.uid());
    elsif old.koupi = auth.uid() and new.koupi is null then
      new.koupi_jmeno := null;
      new.koupeno_at := null;
      new.expense_id := null;
    elsif old.koupi is not null then
      raise exception 'Dárek už si zamluvil(a) %.', coalesce(old.koupi_jmeno, 'někdo jiný');
    else
      raise exception 'Dárek jde zamluvit jen pro sebe.';
    end if;
  elsif new.koupi_jmeno is distinct from old.koupi_jmeno then
    new.koupi_jmeno := old.koupi_jmeno;
  end if;

  -- Koupeno a výdaj k němu: jen ten, kdo dárek zamluvil.
  if (new.koupeno_at is distinct from old.koupeno_at or new.expense_id is distinct from old.expense_id)
     and new.koupi is distinct from auth.uid() and new.koupi is not null then
    raise exception 'Koupeno označuje ten, kdo si dárek zamluvil.';
  end if;
  if new.koupeno_at is not null and new.koupi is null then
    raise exception 'Nejdřív si dárek zamluvte.';
  end if;
  if new.expense_id is distinct from old.expense_id and new.expense_id is not null
     and not exists (select 1 from expenses where id = new.expense_id and family_id = new.family_id) then
    raise exception 'Výdaj nepatří do této rodiny.';
  end if;

  return new;
end;
$$;

drop trigger if exists hlidej_darek_trg on darky;
create trigger hlidej_darek_trg before insert or update on darky
  for each row execute function hlidej_darek();
