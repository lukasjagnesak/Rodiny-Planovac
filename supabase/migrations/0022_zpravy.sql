-- ═══════════════════════════════════════════════════════════════════
--  Komunikace mezi rodiči se záznamem
--
--  Není to chat. Chat mají lidé v telefonu a je lepší než ten, který
--  bychom postavili. Cenu má jedině to, co WhatsApp neumí: zprávu, kterou
--  nikdo nepřepíše ani nesmaže, s razítkem odeslání i přečtení a s vazbou
--  na den, výdaj nebo událost, ke kterým se vztahuje.
--
--  Proto tu nejsou politiky pro UPDATE ani DELETE. Není to opomenutí —
--  je to celá pointa. Kdyby šlo zprávu upravit, je záznam k ničemu
--  a rodič, který se o něj opře před soudem, dostane od druhé strany
--  otázku „a jak víme, že jste to nepřepsal".
-- ═══════════════════════════════════════════════════════════════════

create table if not exists zpravy (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references families (id) on delete cascade,

  -- Autor zůstává i po smazání účtu jako jméno. Záznam, ze kterého se
  -- po odchodu jedné strany stane „někdo napsal", není záznam.
  autor        uuid references profiles (id) on delete set null,
  autor_jmeno  text not null,

  text         text not null check (char_length(btrim(text)) between 1 and 4000),

  -- K čemu se zpráva vztahuje. Všechno nepovinné: většina zpráv je
  -- prostě k dnešku.
  den          date,
  child_id     uuid references children (id) on delete set null,
  expense_id   uuid references expenses (id) on delete set null,
  event_id     uuid references events (id) on delete set null,

  created_at   timestamptz not null default now()
);

create index if not exists zpravy_rodina_idx on zpravy (family_id, created_at desc);
create index if not exists zpravy_kontext_idx on zpravy (expense_id, event_id, den);

-- ── Přečtení ──────────────────────────────────────────────────────
-- Razítko první přečtení, ne „doručeno". Zajímá to obě strany: jedna
-- ví, že to druhá viděla, druhá nemůže tvrdit, že se nic nedozvěděla.
create table if not exists zpravy_precteni (
  zprava_id    uuid not null references zpravy (id) on delete cascade,
  user_id      uuid not null references profiles (id) on delete cascade,
  precteno_at  timestamptz not null default now(),
  primary key (zprava_id, user_id)
);

alter table zpravy enable row level security;
alter table zpravy_precteni enable row level security;

-- Číst smí každý člen rodiny — i po vypršení předplatného.
drop policy if exists zpravy_select on zpravy;
create policy zpravy_select on zpravy
  for select using (is_family_member(family_id));

-- Psát smí jen pečující role a jen sám za sebe. `can_edit_family`
-- nese i podmínku předplatného, takže v režimu čtení se nepíše.
drop policy if exists zpravy_insert on zpravy;
create policy zpravy_insert on zpravy
  for insert with check (can_edit_family(family_id) and autor = auth.uid());

-- ŽÁDNÁ politika pro update ani delete. Viz komentář nahoře.

drop policy if exists zpravy_precteni_select on zpravy_precteni;
create policy zpravy_precteni_select on zpravy_precteni
  for select using (
    exists (select 1 from zpravy z where z.id = zprava_id and is_family_member(z.family_id))
  );

-- Přečtení si zapisuje každý jen sám sobě a jen jednou; opakovaný
-- pokus spadne na primárním klíči, takže razítko drží první pohled.
drop policy if exists zpravy_precteni_insert on zpravy_precteni;
create policy zpravy_precteni_insert on zpravy_precteni
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from zpravy z where z.id = zprava_id and is_family_member(z.family_id))
  );

comment on table zpravy is
  'Komunikace mezi rodiči. Zprávy nejdou upravit ani smazat — chybějící politiky pro UPDATE a DELETE jsou záměr, ne opomenutí.';
