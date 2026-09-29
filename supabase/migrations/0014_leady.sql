-- ═══════════════════════════════════════════════════════════════════
--  Leady z veřejného webu
--
--  Obsahové stránky (průvodce, vzor dohody, kalkulačka výživného) sbírají
--  e-maily výměnou za materiál. Partnerské stránky pro advokáty a mediátory
--  sbírají navíc jméno a organizaci. Je to jedna tabulka, protože jde pořád
--  o totéž: někdo nechal kontakt a čeká, že se ozveme.
--
--  Bez politik schválně — sahá sem jen serverová část přes servisní klíč.
--  Zápis chodí z veřejného endpointu, takže na něj nesmí být vidět z klienta.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists leady (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,

  -- Za co člověk e-mail nechal: 'checklist-30-dni', 'vzor-dohody',
  -- 'pdf-vyzivne', 'advokati', 'mediatori', 'newsletter'…
  -- Volný text schválně: přibývají rychleji, než by se stíhal měnit enum.
  magnet        text not null,

  -- Partnerské formuláře. U obsahových stránek zůstává prázdné.
  jmeno         text,
  organizace    text,
  telefon       text,
  zprava        text,

  -- Odkud návštěvník přišel. Měříme kanál, ne osobu.
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  -- Kód partnera z affiliate programu (advokát, mediátor).
  ref           text,
  referrer      text,
  landing       text,

  created_at    timestamptz not null default now()
);

-- Stejný e-mail se může přihlásit na víc materiálů; duplicitu na jednom
-- materiálu ale držet nechceme, jinak by se dvojklik počítal dvakrát.
create unique index if not exists leady_email_magnet_idx
  on leady (lower(email), magnet);

create index if not exists leady_created_idx on leady (created_at desc);
create index if not exists leady_magnet_idx on leady (magnet);
create index if not exists leady_ref_idx on leady (ref) where ref is not null;

alter table leady enable row level security;
-- Žádné politiky schválně: přístup má jen servisní klíč.
