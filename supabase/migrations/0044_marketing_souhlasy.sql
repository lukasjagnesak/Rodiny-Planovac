-- ═══════════════════════════════════════════════════════════════════
--  Marketingové souhlasy a synchronizace do Mailchimpu
--
--  Registrace do aplikace není souhlas s obchodními sděleními. Proto
--  vlastní evidence: kdo, kdy, s jakou verzí textu a odkud souhlas dal
--  nebo odvolal. Mailchimp je jen kanál; zdrojem pravdy je tahle
--  databáze.
--
--  Do Mailchimpu se nic neposílá přímo z triggeru. Trigger jen zapíše
--  úlohu do fronty ve stejné transakci jako změnu — když se transakce
--  nepovede, není ani úloha; když se povede, úloha nezmizí, dokud ji
--  worker (`/api/cron/marketing`) nedokončí. Proto ne Database Webhooks:
--  ty odešlou požadavek jednou a o neúspěchu se nikdo nedozví.
--
--  Nic se tu nemaže ani nepřepisuje. Jen nové tabulky, funkce
--  a triggery; `handle_new_user` zůstává, jak je.
-- ═══════════════════════════════════════════════════════════════════

-- ── Verze textu souhlasu ─────────────────────────────────────────────
-- Text se nikdy nemění na místě. Nová formulace = nová verze, aby šlo
-- dohledat, s čím přesně kdo souhlasil.
create table if not exists marketing_souhlas_texty (
  verze      text primary key,
  text       text not null,
  platne_od  timestamptz not null default now()
);

insert into marketing_souhlas_texty (verze, text) values (
  '2026-11-v1',
  'Chci e-mailem dostávat praktické tipy pro organizaci péče o děti, novinky a nabídky Klidoo. Souhlas mohu kdykoliv odvolat.'
) on conflict (verze) do nothing;

alter table marketing_souhlas_texty enable row level security;
drop policy if exists marketing_souhlas_texty_cteni on marketing_souhlas_texty;
create policy marketing_souhlas_texty_cteni on marketing_souhlas_texty
  for select using (true);

-- ── Aktuální stav kontaktu ───────────────────────────────────────────
-- Jeden řádek na uživatele, a jen pro ty, kdo se k marketingu někdy
-- vyjádřili. Kdo nikdy nic nezaškrtl, tu není a do Mailchimpu se nedostane.
create table if not exists marketing_kontakty (
  user_id          uuid primary key references profiles (id) on delete cascade,

  -- Platné oprávnění k obchodním sdělením právě teď.
  souhlas          boolean not null default false,
  souhlas_verze    text references marketing_souhlas_texty (verze),
  souhlas_at       timestamptz,
  odvolano_at      timestamptz,
  -- Odkud přišel poslední souhlas: registrace, registrace-google,
  -- pozvanka, nastaveni. Jde do Mailchimpu jako SOURCE.
  zdroj            text,

  -- Co víme o kontaktu v Mailchimpu. Mailchimp je zdroj pravdy o tom,
  -- jestli tam kontakt je přihlášený; my si jen pamatujeme poslední stav.
  mc_status        text check (mc_status in
                     ('pending', 'subscribed', 'unsubscribed', 'cleaned', 'archived', 'transactional')),
  mc_status_at     timestamptz,
  -- Adresa, pod kterou kontakt v Audience je. Může se lišit od účtu,
  -- když si ji člověk změní přímo v Mailchimpu.
  mc_email         text,
  -- Odhlášení v Mailchimpu. Dokud je novější než souhlas, kontakt se
  -- znovu nepřihlašuje — ani při úpravě profilu.
  mc_odhlaseno_at  timestamptz,
  -- E-mail účtu v době poslední synchronizace. Pozná se podle něj, že si
  -- člověk změnil e-mail v Klidoo (ne v Mailchimpu).
  ucet_email_sync  text,

  -- Uvítací sekvence se spouští jen jednou za život kontaktu.
  welcome_at       timestamptz,

  posledni_sync_at timestamptz,
  posledni_chyba   text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists marketing_kontakty_mc_email_idx on marketing_kontakty (lower(mc_email));
create index if not exists marketing_kontakty_sync_idx on marketing_kontakty (posledni_sync_at);

drop trigger if exists marketing_kontakty_touch on marketing_kontakty;
create trigger marketing_kontakty_touch before update on marketing_kontakty
  for each row execute function touch_updated_at();

alter table marketing_kontakty enable row level security;
-- Uživatel vidí jen svůj stav. Měnit ho smí jen přes `nastav_marketing_souhlas`,
-- aby každá změna měla záznam v historii.
drop policy if exists marketing_kontakty_vlastni on marketing_kontakty;
create policy marketing_kontakty_vlastni on marketing_kontakty
  for select using (user_id = auth.uid());

-- ── Auditní historie souhlasů ────────────────────────────────────────
-- Jen přibývá. Po smazání účtu zůstane bez vazby na člověka (user_id
-- null) — jako anonymní statistika, ne jako osobní údaj.
create table if not exists marketing_souhlasy_historie (
  id          bigserial primary key,
  user_id     uuid references profiles (id) on delete set null,
  udalost     text not null check (udalost in (
                'udelen',                     -- zaškrtl souhlas
                'odvolan',                    -- odškrtl v nastavení
                'odhlasen_odkazem',           -- odkaz /odhlasit z našeho e-mailu
                'odhlasen_v_mailchimpu',      -- odkaz v e-mailu z Mailchimpu
                'potvrzen_double_opt_in',     -- klikl na potvrzení od Mailchimpu
                'cleaned',                    -- adresa nedoručitelná
                'email_zmenen_v_mailchimpu'
              )),
  verze       text references marketing_souhlas_texty (verze),
  zdroj       text,
  created_at  timestamptz not null default now()
);

create index if not exists marketing_historie_user_idx on marketing_souhlasy_historie (user_id, created_at);

alter table marketing_souhlasy_historie enable row level security;
drop policy if exists marketing_historie_vlastni on marketing_souhlasy_historie;
create policy marketing_historie_vlastni on marketing_souhlasy_historie
  for select using (user_id = auth.uid());

-- Historii nejde přepsat ani smazat. Jediná povolená změna je odpojení
-- od smazaného účtu (on delete set null), které dělá sama databáze.
create or replace function marketing_historie_jen_pridavat()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Historie souhlasů se nemaže.';
  end if;
  if new.user_id is null
     and old.user_id is not null
     and (new.id, new.udalost, new.verze, new.zdroj, new.created_at)
         is not distinct from (old.id, old.udalost, old.verze, old.zdroj, old.created_at) then
    return new;
  end if;
  raise exception 'Historie souhlasů se nepřepisuje.';
end;
$$;

drop trigger if exists marketing_historie_ochrana on marketing_souhlasy_historie;
create trigger marketing_historie_ochrana
  before update or delete on marketing_souhlasy_historie
  for each row execute function marketing_historie_jen_pridavat();

-- ── Fronta úloh pro Mailchimp (outbox) ───────────────────────────────
-- Bez cizího klíče na uživatele schválně: úloha „smazat“ musí přežít
-- smazání účtu, kvůli kterému vznikla.
create table if not exists marketing_fronta (
  id              bigserial primary key,
  user_id         uuid,
  druh            text not null check (druh in ('sync', 'smazat')),
  -- Jen u „smazat“: adresa v Mailchimpu. Po dokončení se vymaže.
  mc_email        text,
  stav            text not null default 'ceka'
                    check (stav in ('ceka', 'zpracovava', 'hotovo', 'vzdano')),
  pokusy          int not null default 0,
  dalsi_pokus_at  timestamptz not null default now(),
  zamceno_at      timestamptz,
  posledni_chyba  text,
  created_at      timestamptz not null default now(),
  hotovo_at       timestamptz
);

-- Na jednoho uživatele nejvýš jedna čekající synchronizace. Úloha čte
-- vždy aktuální stav, takže deset změn za minutu = jedna synchronizace.
create unique index if not exists marketing_fronta_jedna_cekajici
  on marketing_fronta (user_id) where druh = 'sync' and stav = 'ceka';
create index if not exists marketing_fronta_k_vyrizeni
  on marketing_fronta (dalsi_pokus_at) where stav in ('ceka', 'zpracovava');

alter table marketing_fronta enable row level security;
-- Bez politik: jen servisní klíč.

-- ── Deduplikace webhooků z Mailchimpu ────────────────────────────────
create table if not exists marketing_webhook_udalosti (
  klic        text primary key,   -- sha256 těla požadavku
  typ         text,
  vysledek    text,
  prijato_at  timestamptz not null default now()
);

alter table marketing_webhook_udalosti enable row level security;
-- Bez politik: jen servisní klíč.

-- ═══════════════════════════════════════════════════════════════════
--  Funkce
-- ═══════════════════════════════════════════════════════════════════

-- Zařadí synchronizaci uživatele. Když už jedna čeká, nic nepřidá.
create or replace function marketing_zarad(p_user uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into marketing_fronta (user_id, druh)
  values (p_user, 'sync')
  on conflict (user_id) where druh = 'sync' and stav = 'ceka' do nothing;
$$;

-- Udělení nebo odvolání souhlasu přihlášeným uživatelem (nastavení,
-- návrat z Google registrace). Jediná cesta, kterou se mění souhlas
-- z aplikace — a vždy se zápisem do historie.
create or replace function nastav_marketing_souhlas(
  p_souhlas boolean,
  p_verze   text,
  p_zdroj   text
)
returns marketing_kontakty
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_radek marketing_kontakty;
begin
  if v_user is null then
    raise exception 'Nepřihlášeno.';
  end if;
  if p_souhlas and not exists (select 1 from marketing_souhlas_texty where verze = p_verze) then
    raise exception 'Neznámá verze textu souhlasu.';
  end if;

  select * into v_radek from marketing_kontakty where user_id = v_user for update;

  -- Stejný stav podruhé (dvojklik) nic nezapisuje.
  if found and v_radek.souhlas = p_souhlas then
    return v_radek;
  end if;
  if not found and not p_souhlas then
    -- Odvolání něčeho, co nikdy nebylo — nic k zaznamenání.
    return null;
  end if;

  insert into marketing_kontakty as k (user_id, souhlas, souhlas_verze, souhlas_at, odvolano_at, zdroj)
  values (
    v_user,
    p_souhlas,
    case when p_souhlas then p_verze end,
    case when p_souhlas then now() end,
    case when p_souhlas then null else now() end,
    case when p_souhlas then left(p_zdroj, 40) end
  )
  on conflict (user_id) do update set
    souhlas       = excluded.souhlas,
    souhlas_verze = coalesce(excluded.souhlas_verze, k.souhlas_verze),
    souhlas_at    = coalesce(excluded.souhlas_at, k.souhlas_at),
    odvolano_at   = case when excluded.souhlas then k.odvolano_at else now() end,
    zdroj         = coalesce(excluded.zdroj, k.zdroj)
  returning * into v_radek;

  insert into marketing_souhlasy_historie (user_id, udalost, verze, zdroj)
  values (v_user, case when p_souhlas then 'udelen' else 'odvolan' end,
          case when p_souhlas then p_verze end, left(p_zdroj, 40));

  return v_radek;
end;
$$;

revoke all on function nastav_marketing_souhlas(boolean, text, text) from public, anon;
grant execute on function nastav_marketing_souhlas(boolean, text, text) to authenticated;

-- Souhlas zaškrtnutý ve formuláři registrace přijde v metadatech nového
-- uživatele. Trigger běží po `on_auth_user_created` (triggery stejné
-- události se spouští podle abecedy), takže profil už existuje.
--
-- Chyba tady nesmí shodit registraci — raději účet bez souhlasu než
-- žádný účet. Přijde varování do logu a člověk může souhlas dát
-- v nastavení.
create or replace function marketing_souhlas_z_registrace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_verze text := new.raw_user_meta_data ->> 'marketing_verze';
  v_zdroj text := left(coalesce(new.raw_user_meta_data ->> 'marketing_zdroj', 'registrace'), 40);
begin
  if coalesce(new.raw_user_meta_data ->> 'marketing_souhlas', '') <> 'true' then
    return new;
  end if;
  begin
    if not exists (select 1 from marketing_souhlas_texty where verze = v_verze) then
      raise warning 'marketing: neznámá verze souhlasu %', v_verze;
      return new;
    end if;
    insert into marketing_kontakty (user_id, souhlas, souhlas_verze, souhlas_at, zdroj)
    values (new.id, true, v_verze, now(), v_zdroj)
    on conflict (user_id) do nothing;
    insert into marketing_souhlasy_historie (user_id, udalost, verze, zdroj)
    values (new.id, 'udelen', v_verze, v_zdroj);
  exception when others then
    raise warning 'marketing: souhlas z registrace se neuložil: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_marketing on auth.users;
create trigger on_auth_user_marketing
  after insert on auth.users
  for each row execute function marketing_souhlas_z_registrace();

-- Změna souhlasu → synchronizace.
create or replace function marketing_kontakt_zmenen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.souhlas is distinct from old.souhlas then
    perform marketing_zarad(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists marketing_kontakty_zmena on marketing_kontakty;
create trigger marketing_kontakty_zmena
  after insert or update of souhlas on marketing_kontakty
  for each row execute function marketing_kontakt_zmenen();

-- Smazání kontaktu (typicky kaskádou se smazáním účtu) → výmaz
-- z Mailchimpu. Úloha si nese adresu, protože uživatel už nebude.
create or replace function marketing_kontakt_smazan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.mc_email is not null or old.mc_status is not null then
    insert into marketing_fronta (user_id, druh, mc_email)
    values (old.user_id, 'smazat',
            coalesce(old.mc_email, (select email from auth.users where id = old.user_id)));
  end if;
  return old;
end;
$$;

drop trigger if exists marketing_kontakty_smazani on marketing_kontakty;
create trigger marketing_kontakty_smazani
  before delete on marketing_kontakty
  for each row execute function marketing_kontakt_smazan();

-- Změna jména → aktualizace FNAME, ale jen u kontaktů, které v Mailchimpu
-- jsou nebo být mají.
create or replace function marketing_profil_zmenen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.full_name is distinct from old.full_name
     and exists (select 1 from marketing_kontakty
                 where user_id = new.id and (souhlas or mc_status in ('subscribed', 'pending'))) then
    perform marketing_zarad(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_marketing on profiles;
create trigger profiles_marketing
  after update of full_name on profiles
  for each row execute function marketing_profil_zmenen();

-- Změna e-mailu účtu. Supabase přepíše `auth.users.email` až po
-- potvrzení nové adresy, takže sem nedorazí neověřený e-mail.
create or replace function marketing_email_zmenen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email
     and exists (select 1 from marketing_kontakty
                 where user_id = new.id and (souhlas or mc_status in ('subscribed', 'pending'))) then
    perform marketing_zarad(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_marketing on auth.users;
create trigger on_auth_user_email_marketing
  after update of email on auth.users
  for each row execute function marketing_email_zmenen();

-- Změna předplatného → tag klidoo_premium.
create or replace function marketing_predplatne_zmeneno()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stav is distinct from old.stav then
    perform marketing_zarad(fm.user_id)
    from family_members fm
    join marketing_kontakty k on k.user_id = fm.user_id and k.souhlas
    where fm.family_id = new.family_id;
  end if;
  return new;
end;
$$;

drop trigger if exists predplatna_marketing on predplatna;
create trigger predplatna_marketing
  after update of stav on predplatna
  for each row execute function marketing_predplatne_zmeneno();

-- ── Pro worker (jen servisní klíč) ───────────────────────────────────

-- Vezme úlohy ke zpracování. `skip locked` drží souběžné běhy (cron
-- a okamžité zpracování po kliknutí) od téže úlohy. Úloha zaseknutá
-- déle než 15 minut (spadlý kontejner) se vezme znovu.
create or replace function marketing_fronta_vezmi(p_limit int)
returns setof marketing_fronta
language sql
security definer
set search_path = public
as $$
  update marketing_fronta f
     set stav = 'zpracovava', zamceno_at = now(), pokusy = f.pokusy + 1
   where f.id in (
     select id from marketing_fronta
      where (stav = 'ceka' and dalsi_pokus_at <= now())
         or (stav = 'zpracovava' and zamceno_at < now() - interval '15 minutes')
      order by id
      for update skip locked
      limit p_limit)
  returning f.*;
$$;

-- Všechno, co worker potřebuje o jednom kontaktu. E-mail z `auth.users`,
-- ne z `profiles` — tam zůstává adresa z doby registrace.
create or replace function marketing_stav(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'user_id',          k.user_id,
    'email',            lower(u.email),
    'jmeno',            p.full_name,
    'registrace',       p.created_at,
    'premium',          exists (
                          select 1 from family_members fm
                          join predplatna pr on pr.family_id = fm.family_id
                          where fm.user_id = k.user_id and pr.stav = 'aktivni'),
    'souhlas',          k.souhlas,
    'souhlas_at',       k.souhlas_at,
    'odvolano_at',      k.odvolano_at,
    'zdroj',            k.zdroj,
    'mc_status',        k.mc_status,
    'mc_email',         k.mc_email,
    'mc_odhlaseno_at',  k.mc_odhlaseno_at,
    'ucet_email_sync',  k.ucet_email_sync,
    'welcome_at',       k.welcome_at
  )
  from marketing_kontakty k
  join profiles p on p.id = k.user_id
  left join auth.users u on u.id = k.user_id
  where k.user_id = p_user;
$$;

-- Uvítání smí odejít jen jednou. Záznam se zabírá PŘED voláním
-- Mailchimpu; když volání selže, worker ho uvolní.
create or replace function marketing_zaber_uvitani(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update marketing_kontakty set welcome_at = now()
   where user_id = p_user and welcome_at is null and souhlas;
  return found;
end;
$$;

-- Průběžná rekonciliace: kontakty, které se víc než den nesynchronizovaly,
-- se zařadí znovu. Volá se při každém běhu workeru s malým limitem,
-- takže se kontrola rozprostře a nezatíží API najednou.
create or replace function marketing_rekonciliace(p_limit int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pocet int := 0;
  v_user uuid;
begin
  for v_user in
    select user_id from marketing_kontakty
     where (souhlas or mc_status in ('subscribed', 'pending'))
       and (posledni_sync_at is null or posledni_sync_at < now() - interval '24 hours')
       and not exists (select 1 from marketing_fronta f
                        where f.user_id = marketing_kontakty.user_id
                          and f.stav in ('ceka', 'zpracovava'))
     order by posledni_sync_at nulls first
     limit p_limit
  loop
    perform marketing_zarad(v_user);
    v_pocet := v_pocet + 1;
  end loop;
  -- Úklid: hotové úlohy a přijaté webhooky starší 30 dní.
  delete from marketing_fronta where stav = 'hotovo' and hotovo_at < now() - interval '30 days';
  delete from marketing_webhook_udalosti where prijato_at < now() - interval '30 days';
  return v_pocet;
end;
$$;

-- Odhlášení odkazem z našeho e-mailu (/odhlasit) platí i pro Mailchimp.
-- Najde účet podle e-mailu účtu i podle adresy v Mailchimpu.
create or replace function marketing_odhlasit_email(p_email text, p_zdroj text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_pocet int := 0;
begin
  for v_user in
    select k.user_id from marketing_kontakty k
      left join auth.users u on u.id = k.user_id
     where k.souhlas
       and (lower(u.email) = lower(trim(p_email)) or lower(k.mc_email) = lower(trim(p_email)))
  loop
    update marketing_kontakty set souhlas = false, odvolano_at = now() where user_id = v_user;
    insert into marketing_souhlasy_historie (user_id, udalost, zdroj)
    values (v_user, 'odhlasen_odkazem', left(p_zdroj, 40));
    v_pocet := v_pocet + 1;
  end loop;
  return v_pocet;
end;
$$;

-- Událost z webhooku Mailchimpu. Vše v jedné transakci včetně
-- deduplikace: opakované doručení téhož těla vrátí 'duplicitni'
-- a nic nezmění.
--
-- Pořadí: Mailchimp nezaručuje pořadí doručení. Odhlášení se proto
-- neignoruje nikdy — jedině když je souhlas v Klidoo novější než
-- samotné odhlášení (člověk se mezitím znovu přihlásil u nás).
create or replace function marketing_mailchimp_udalost(
  p_klic       text,
  p_typ        text,
  p_email      text,
  p_novy_email text,
  p_fired_at   timestamptz,
  p_klidoo_id  uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_k marketing_kontakty;
  v_vysledek text;
begin
  insert into marketing_webhook_udalosti (klic, typ) values (p_klic, p_typ)
  on conflict (klic) do nothing;
  if not found then
    return 'duplicitni';
  end if;

  -- Kontakt podle KLIDOO_ID, ale jen když sedí i adresa; jinak podle adresy.
  select k.* into v_k from marketing_kontakty k
    left join auth.users u on u.id = k.user_id
   where k.user_id = p_klidoo_id
     and lower(p_email) in (lower(k.mc_email), lower(u.email));
  if not found then
    select k.* into v_k from marketing_kontakty k
     where lower(k.mc_email) = lower(p_email)
     order by k.updated_at desc limit 1;
  end if;
  if not found then
    update marketing_webhook_udalosti set vysledek = 'neznamy-kontakt' where klic = p_klic;
    return 'neznamy-kontakt';
  end if;
  v_user := v_k.user_id;

  if p_typ = 'unsubscribe' then
    if v_k.souhlas and v_k.souhlas_at > p_fired_at then
      v_vysledek := 'zastarale';
    else
      update marketing_kontakty
         set souhlas = false,
             odvolano_at = case when souhlas then now() else odvolano_at end,
             mc_status = 'unsubscribed', mc_status_at = p_fired_at,
             mc_odhlaseno_at = p_fired_at
       where user_id = v_user;
      insert into marketing_souhlasy_historie (user_id, udalost, zdroj)
      values (v_user, 'odhlasen_v_mailchimpu', 'mailchimp');
      v_vysledek := 'odhlaseno';
    end if;

  elsif p_typ = 'cleaned' then
    update marketing_kontakty
       set mc_status = 'cleaned', mc_status_at = p_fired_at
     where user_id = v_user;
    insert into marketing_souhlasy_historie (user_id, udalost, zdroj)
    values (v_user, 'cleaned', 'mailchimp');
    v_vysledek := 'cleaned';

  elsif p_typ = 'subscribe' then
    if v_k.mc_status_at is not null and p_fired_at < v_k.mc_status_at then
      v_vysledek := 'zastarale';
    elsif v_k.souhlas then
      update marketing_kontakty
         set mc_status = 'subscribed', mc_status_at = p_fired_at
       where user_id = v_user;
      if v_k.mc_status = 'pending' then
        insert into marketing_souhlasy_historie (user_id, udalost, verze, zdroj)
        values (v_user, 'potvrzen_double_opt_in', v_k.souhlas_verze, 'mailchimp');
      end if;
      -- Po potvrzení double opt-in teprve smí přijít uvítání.
      perform marketing_zarad(v_user);
      v_vysledek := 'prihlaseno';
    else
      -- Přihlásil se přímo u Mailchimpu, ne u nás. Zaznamenáme stav,
      -- ale souhlas v Klidoo z toho nevyrábíme.
      update marketing_kontakty
         set mc_status = 'subscribed', mc_status_at = p_fired_at
       where user_id = v_user;
      v_vysledek := 'prihlaseno-mimo-klidoo';
    end if;

  elsif p_typ = 'upemail' then
    if p_novy_email is null or p_novy_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      v_vysledek := 'neplatny-email';
    else
      update marketing_kontakty
         set mc_email = lower(trim(p_novy_email)), mc_status_at = greatest(mc_status_at, p_fired_at)
       where user_id = v_user;
      insert into marketing_souhlasy_historie (user_id, udalost, zdroj)
      values (v_user, 'email_zmenen_v_mailchimpu', 'mailchimp');
      v_vysledek := 'email-zmenen';
    end if;

  else
    v_vysledek := 'ignorovano';
  end if;

  update marketing_webhook_udalosti set vysledek = v_vysledek where klic = p_klic;
  return v_vysledek;
end;
$$;

-- Funkce workeru a webhooku smí volat jen servisní klíč.
revoke all on function marketing_zarad(uuid) from public, anon, authenticated;
revoke all on function marketing_fronta_vezmi(int) from public, anon, authenticated;
revoke all on function marketing_stav(uuid) from public, anon, authenticated;
revoke all on function marketing_zaber_uvitani(uuid) from public, anon, authenticated;
revoke all on function marketing_rekonciliace(int) from public, anon, authenticated;
revoke all on function marketing_odhlasit_email(text, text) from public, anon, authenticated;
revoke all on function marketing_mailchimp_udalost(text, text, text, text, timestamptz, uuid) from public, anon, authenticated;
grant execute on function marketing_zarad(uuid) to service_role;
grant execute on function marketing_fronta_vezmi(int) to service_role;
grant execute on function marketing_stav(uuid) to service_role;
grant execute on function marketing_zaber_uvitani(uuid) to service_role;
grant execute on function marketing_rekonciliace(int) to service_role;
grant execute on function marketing_odhlasit_email(text, text) to service_role;
grant execute on function marketing_mailchimp_udalost(text, text, text, text, timestamptz, uuid) to service_role;
