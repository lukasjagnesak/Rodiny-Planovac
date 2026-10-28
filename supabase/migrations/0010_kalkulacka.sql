-- ═══════════════════════════════════════════════════════════════════
--  Veřejná kalkulačka střídavé péče
--
--  Rozpis si člověk naklikne bez přihlášení a spočítá se mu v prohlížeči.
--  Sem se ukládá až ve chvíli, kdy si ho chce uložit nebo poslat druhému
--  rodiči — teprve tehdy má smysl něco držet.
--
--  Tabulka je záměrně bez politik: sahá na ni jen serverová část přes
--  servisní klíč. Odkaz na rozpis chrání náhodný token, takže žádná
--  role se sem nedostane přímo a tokeny nejdou procházet.
--
--  Jména dětí se tu nevedou. Veřejný nástroj bez přihlášení není místo,
--  kde by měly ležet, a k výpočtu nejsou potřeba.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists kalkulacka_plany (
  id            uuid primary key default gen_random_uuid(),
  -- Náhodný řetězec v odkazu; zároveň to jediné, čím se rozpis otevírá.
  token         text not null unique,

  -- Vzor střídání ve stejném tvaru, jaký používá aplikace.
  kind          text not null check (
                  kind in ('iso_week_parity', 'alternating_weeks',
                           'week_2_2_3', 'custom_weekly', 'fixed_parent')),
  anchor_date   date not null,
  anchor_side   text not null check (anchor_side in ('a', 'b')),
  weekly_map    text,
  pocet_deti    smallint not null default 1 check (pocet_deti between 1 and 6),

  -- Popisky stran, ne jména dětí.
  jmeno_a       text,
  jmeno_b       text,

  email         text,
  -- Souhlas s obchodními sděleními je zvlášť; poslat vlastní výsledek
  -- je plnění požadavku, cokoli dalšího už potřebuje tohle.
  souhlas_marketing boolean not null default false,

  -- Odkud člověk přišel — kvůli měření, ne kvůli sledování osob.
  zdroj         text,

  claimed_by    uuid references profiles (id) on delete set null,
  claimed_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists kalkulacka_plany_email_idx
  on kalkulacka_plany (email) where email is not null;

create index if not exists kalkulacka_plany_created_idx
  on kalkulacka_plany (created_at desc);

alter table kalkulacka_plany enable row level security;
-- Žádné politiky schválně: přístup má jen servisní klíč.
