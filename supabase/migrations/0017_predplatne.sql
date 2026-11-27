-- ═══════════════════════════════════════════════════════════════════
--  Předplatné
--
--  Platí rodina, ne uživatel — druhý rodič má přístup zdarma a je to
--  hlavní slib produktu. Proto je předplatné navázané na `families`.
--
--  Zkušební období běží od založení rodiny a nepotřebuje kartu. Datum
--  konce se drží v tabulce, ne dopočítává z `created_at`: až se objeví
--  důvod někomu trial prodloužit, nemá se to kde ohnout.
-- ═══════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (select 1 from pg_type where typname = 'stav_predplatneho') then
    create type stav_predplatneho as enum (
      'zkusebni',   -- běží 30 dní zdarma
      'aktivni',    -- zaplaceno
      'po_splatnosti', -- platba selhala, Stripe to ještě zkouší
      'zruseno',    -- konec období, režim čtení
      'vyprsel'     -- zkušební období doběhlo bez platby
    );
  end if;
end $$;

create table if not exists predplatna (
  family_id     uuid primary key references families (id) on delete cascade,
  stav          stav_predplatneho not null default 'zkusebni',

  -- Do kdy je přístup k zápisu. U zkušebního i placeného období totéž.
  plati_do      timestamptz not null,

  -- Stripe. Prázdné, dokud rodina nezaplatila.
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  -- 'mesicni' | 'rocni' — kvůli přehledu, ne kvůli logice.
  tarif         text,

  -- Kdo platbu založil. Zrušit ji smí i jiný správce rodiny.
  zalozil       uuid references profiles (id) on delete set null,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists predplatna_plati_do_idx on predplatna (plati_do);
create index if not exists predplatna_stav_idx on predplatna (stav);

-- ── Zkušební období se založí spolu s rodinou ─────────────────────
create or replace function zaloz_zkusebni_obdobi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into predplatna (family_id, stav, plati_do)
  values (new.id, 'zkusebni', now() + interval '30 days')
  on conflict (family_id) do nothing;
  return new;
end;
$$;

drop trigger if exists rodina_zkusebni_obdobi on families;
create trigger rodina_zkusebni_obdobi
  after insert on families
  for each row execute function zaloz_zkusebni_obdobi();

-- Rodinám, které vznikly dřív, dopočítáme třicet dní od jejich založení.
insert into predplatna (family_id, stav, plati_do)
select f.id, 'zkusebni', f.created_at + interval '30 days'
from families f
where not exists (select 1 from predplatna p where p.family_id = f.id)
on conflict (family_id) do nothing;

-- ── Zabezpečení ───────────────────────────────────────────────────
alter table predplatna enable row level security;

-- Členové rodiny svoje předplatné vidí. Měnit ho smí jen server přes
-- servisní klíč — jinak by si stav mohl přepsat kdokoli.
drop policy if exists predplatna_cteni on predplatna;
create policy predplatna_cteni on predplatna
  for select using (is_family_member(family_id));
