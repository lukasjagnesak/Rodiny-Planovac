-- ═══════════════════════════════════════════════════════════════════
--  Přenos z kalkulačky výživného do aplikace
--
--  Na kalkulačku výživného vede placená kampaň. Člověk si spočítá
--  částku, opíše si ji a odejde — a všechno, co naklikal, zahodíme.
--  Tahle tabulka je most: výpočet se uloží pod náhodný token a po
--  registraci se z něj předvyplní průvodce a založí opakovaný výdaj.
--
--  Stejný vzorec už jede u kalkulačky střídavé péče (`kalkulacka_plany`).
--
--  PŘÍJMY SE SEM NEUKLÁDAJÍ, A TO SCHVÁLNĚ. Kdo kolik bere je to
--  nejcitlivější, co na webu bez přihlášení padne, a k ničemu, co se
--  přenáší, to není potřeba — částka je spočítaná a rozvrh stojí na
--  podílu péče. Kalkulačka počítá v prohlížeči; na server jde až tohle.
--
--  Bez politik schválně: sahá sem jen serverová část přes servisní klíč.
--  Plán se otevírá jedině tokenem, takže tokeny nejdou procházet.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists vyzivne_plany (
  id            uuid primary key default gen_random_uuid(),
  -- Náhodný řetězec v odkaze; zároveň to jediné, čím se plán otevírá.
  token         text not null unique,

  -- Etapy dětí, ne jejich věk a už vůbec ne jména. Počet se dopočítá
  -- z délky pole, aby nešly rozejít.
  etapy         text[] not null check (
                  array_length(etapy, 1) between 1 and 6),

  -- Podíl péče rodiče A v procentech. Z něj se odvozuje rozvrh.
  pece_a        smallint not null check (pece_a between 0 and 100),

  -- Kdo platí. NULL, když se výživné podle zadání nestanovuje —
  -- to je u rovnoměrné péče a podobných příjmů obvyklý výsledek.
  plati         text check (plati in ('a', 'b')),
  -- Měsíčně za všechny děti dohromady. Počítá ji server, ne prohlížeč.
  castka        numeric(12, 2) not null default 0 check (castka >= 0),

  -- Odkud člověk přišel — kvůli měření kanálů, ne kvůli sledování osob.
  zdroj         text,

  claimed_by    uuid references profiles (id) on delete set null,
  claimed_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists vyzivne_plany_created_idx
  on vyzivne_plany (created_at desc);

alter table vyzivne_plany enable row level security;
-- Žádné politiky schválně: přístup má jen servisní klíč.

comment on table vyzivne_plany is
  'Výpočet z veřejné kalkulačky výživného, který čeká na převzetí do aplikace. Bez příjmů.';
