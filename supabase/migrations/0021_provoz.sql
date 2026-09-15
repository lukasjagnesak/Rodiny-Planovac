-- ═══════════════════════════════════════════════════════════════════
--  Měření provozu a cesty zákazníka
--
--  Vlastní měření místo Google Analytics ze dvou důvodů: web slibuje,
--  že nikoho nesleduje, a rozvod je téma, u kterého tenhle slib nemá
--  být marketingová věta. Neukládá se IP ani nic, čím by šel člověk
--  najít — jen otisk, který se každý den mění a nedá se otočit zpátky.
--
--  Tabulka je čistě pro provozovatele. Bez politik: sahá sem jen server
--  přes servisní klíč, klient na ni nevidí ani po přihlášení.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists provoz_udalosti (
  id            bigserial primary key,

  -- 'zobrazeni' | 'kalkulacka' | 'lead' | 'registrace' | 'rodina'
  -- | 'druhy_rodic' | 'predplatne'
  -- Volný text s kontrolou schválně: nové kroky trychtýře přibývají
  -- rychleji, než by se stíhal měnit typ.
  druh          text not null check (char_length(druh) between 3 and 40),

  cesta         text,
  -- Doména odkazujícího webu, ne celá adresa. Google stačí jako „google".
  zdroj         text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  ref           text,
  /** 'mobil' | 'pocitac' */
  zarizeni      text,

  -- Otisk návštěvníka: hash z IP, prohlížeče a soli, která se každý den
  -- mění. Slouží k počítání „kolik lidí", ne „který člověk" — po půlnoci
  -- je z téhož návštěvníka někdo jiný a zpětně to nejde spojit.
  navstevnik    text,

  created_at    timestamptz not null default now()
);

create index if not exists provoz_udalosti_cas_idx on provoz_udalosti (created_at desc);
create index if not exists provoz_udalosti_druh_idx on provoz_udalosti (druh, created_at desc);
create index if not exists provoz_udalosti_navstevnik_idx
  on provoz_udalosti (navstevnik, created_at desc) where navstevnik is not null;

alter table provoz_udalosti enable row level security;

comment on table provoz_udalosti is
  'Anonymní měření návštěvnosti a trychtýře. Čte jen provozovatel přes servisní klíč.';
