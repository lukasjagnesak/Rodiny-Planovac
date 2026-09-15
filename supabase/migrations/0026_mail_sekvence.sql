-- E-mailové sekvence pro kontakty z webu a odhlášení z nich.
--
-- Kdo si stáhne vzor dohody, nechá e-mail kvůli materiálu. Sekvence na
-- něj navazuje: poděkuje a nabídne aplikaci. Aby to nebyl spam, musí
-- platit dvě věci — nikdo nedostane tentýž e-mail dvakrát a odhlásit se
-- musí jít jedním kliknutím.

-- Který kontakt už dostal který krh které sekvence.
--
-- Jednoznačnost hlídá databáze, ne aplikace. Cron může kvůli restartu
-- nebo souběhu proběhnout dvakrát a druhý zápis pak prostě selže —
-- což je přesně to, co chceme. Kdyby to hlídal jen kód, stačilo by
-- jedno nešťastné načasování a lidem chodí zprávy dvakrát.
create table if not exists lead_sekvence_kroky (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references leady(id) on delete cascade,
  sekvence   text not null,
  krok       text not null,
  poslano_at timestamptz not null default now(),

  unique (lead_id, sekvence, krok)
);

create index if not exists lead_sekvence_lead_idx on lead_sekvence_kroky (lead_id);

alter table lead_sekvence_kroky enable row level security;
-- Žádné politiky schválně: přístup má jen servisní klíč, stejně jako
-- u tabulky `leady`.

-- Kdo si nepřeje další zprávy.
--
-- Klíčem je e-mail, ne odkaz na `leady`. Jeden člověk tam totiž může mít
-- víc řádků — za každý stažený materiál jeden — a odhlášení z jedné
-- sekvence, po kterém dál chodí druhá, je přesně ten druh chování,
-- kvůli kterému lidi označují poštu jako spam.
create table if not exists mail_odhlaseni (
  email        text primary key,
  duvod        text,
  odhlaseno_at timestamptz not null default now()
);

alter table mail_odhlaseni enable row level security;

-- Adresa se ukládá malými písmeny, aby se odhlášení nedalo obejít
-- napsáním e-mailu jinak. Vynucené v databázi, ne v aplikaci — do téhle
-- tabulky se zapisuje z odhlašovací stránky a mohl by přibýt další zdroj.
create or replace function mail_odhlaseni_mala_pismena()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists mail_odhlaseni_pred_zapisem on mail_odhlaseni;
create trigger mail_odhlaseni_pred_zapisem
  before insert or update on mail_odhlaseni
  for each row execute function mail_odhlaseni_mala_pismena();
