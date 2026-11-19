-- Partnerský program: mediátoři a advokáti, kteří doporučují Klidoo.
--
-- Slib „25 % z předplatného doporučených rodin" existoval na webu, ale
-- nebylo čím ho splnit — nikde se nezaznamenávalo, že rodina přišla přes
-- partnera, ani kolik zaplatila.
--
-- Partner nevidí a nikdy nesmí vidět data rodin. Jde o údaje o dětech
-- a o penězích obou rodičů, které mu nepřísluší už proto, že mediace
-- stojí na mlčenlivosti. Vidí jen svoje obchodní čísla: kolik rodin
-- přišlo, kolik jich platí a kolik mu naběhlo. Rodinný detail si rodina
-- vygeneruje sama v /souhrn a dá mu ho, když chce.

create table if not exists partneri (
  id            uuid primary key default gen_random_uuid(),

  -- Kód v odkaze: klidoo.cz/?ref=kod. Malá písmena, ať se nedá splést
  -- při přepisu z vizitky.
  kod           text not null,
  jmeno         text not null,
  organizace    text,

  -- Přihlášení do portálu je na e-mail. Žádná další hesla — partner
  -- se přihlásí odkazem stejně jako kdokoli jiný a portál si ho podle
  -- adresy najde.
  email         text not null,
  user_id       uuid references auth.users (id) on delete set null,

  typ           text not null default 'mediator',
  -- Sazba je u partnera, ne v konstantě: u někoho se domluví jinak
  -- a měnit ji celoplošně kvůli jedné výjimce by přepsalo i minulost.
  provize_procento int not null default 25,
  aktivni       bool not null default true,
  poznamka      text,
  created_at    timestamptz not null default now()
);

create unique index if not exists partneri_kod_idx on partneri (lower(kod));
create unique index if not exists partneri_email_idx on partneri (lower(email));

-- Která rodina přišla přes kterého partnera.
--
-- Jedna rodina patří nejvýš jednomu partnerovi — proto jedinečnost na
-- `family_id`. Kdyby si klient prošel dva odkazy, platí ten první;
-- dohadovat se o provizi zpětně je horší než pravidlo, které je předem
-- jasné.
create table if not exists doporuceni (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references partneri (id) on delete cascade,
  family_id   uuid not null references families (id) on delete cascade,
  -- Kód v době vzniku. Partner ho může časem změnit, ale historie ne.
  kod         text not null,
  vzniklo_at  timestamptz not null default now(),

  unique (family_id)
);

create index if not exists doporuceni_partner_idx on doporuceni (partner_id);

-- Zaplacené faktury.
--
-- Bez nich nejde provizi spočítat poctivě. Ze stavu předplatného se dá
-- vyčíst jen to, že rodina platí — ne kolikrát a kolik, takže by se
-- provize odhadovala z ceníku a rozcházela se se skutečností.
--
-- `stripe_invoice_id` je jedinečný schválně: Stripe posílá webhooky
-- opakovaně a bez toho by se jedna platba započítala třikrát.
create table if not exists platby (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references families (id) on delete cascade,
  stripe_invoice_id text not null,
  castka            numeric(12, 2) not null,
  mena              text not null default 'CZK',
  zaplaceno_at      timestamptz not null,
  created_at        timestamptz not null default now()
);

create unique index if not exists platby_faktura_idx on platby (stripe_invoice_id);
create index if not exists platby_rodina_idx on platby (family_id, zaplaceno_at);

alter table partneri enable row level security;
alter table doporuceni enable row level security;
alter table platby enable row level security;
-- Žádné politiky schválně. Ke všem třem tabulkám se chodí jen servisním
-- klíčem ze serveru: partnerský portál si napřed ověří, že přihlášený
-- e-mail patří partnerovi, a teprve pak čte — a čte jen součty.
