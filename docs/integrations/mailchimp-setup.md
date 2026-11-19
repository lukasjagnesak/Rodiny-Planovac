# Mailchimp: nastavení a nasazení

Každý krok, který mění produkci, má svou **bránu schválení**. Bez ní se
dál nepokračuje.

## 0. Co se nasazením kódu stane a co ne

**Stane se:**
- registrace ukáže nepovinný checkbox,
- v Nastavení přibude „E-maily“,
- souhlasy se začnou evidovat v databázi.

**Nestane se nic v Mailchimpu.** Dokud v `.env` není
`MAILCHIMP_ZAPNUTO=1`, worker nic nezapisuje a úlohy čekají ve frontě.

## 1. Ověření ostré databáze (jen čtení)

V Supabase → SQL Editor:

```sql
-- Kolik je uživatelů a jestli schéma odpovídá auditu
select count(*) as uzivatelu from auth.users;
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'profiles' order by ordinal_position;
select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;
-- Je zapnuté potvrzení e-mailu? (počet nepotvrzených účtů)
select count(*) filter (where email_confirmed_at is null) as nepotvrzenych from auth.users;
```

## 2. Migrace (brána: vaše schválení)

1. Vložte celý obsah `supabase/migrations/0044_marketing_souhlasy.sql`
   do SQL Editoru a spusťte ho.
2. Pak spusťte:
   ```sql
   notify pgrst, 'reload schema';
   ```
3. Ověřte:
   ```sql
   select verze from marketing_souhlas_texty;                       -- 2026-11-v1
   select count(*) from marketing_kontakty;                         -- 0
   select tgname from pg_trigger where tgname like '%marketing%';   -- 8 triggerů
   ```

## 3. Mailchimp účet

### 3.1 API klíč
1. Mailchimp → profilová ikona → **Profile → Extras → API keys →
   Create A Key**.
2. Pojmenujte ho „Klidoo server“.
3. Klíč končí příponou datacentra, např. `…-us21`.
4. Klíč vložte jen do `.env` na serveru, nikam jinam.

### 3.2 Audience „Klidoo“ a její ID
1. **Audience → All contacts → Settings → Audience name and defaults**.
2. Pole **Audience ID** (např. `a1b2c3d4e5`) zkopírujte do
   `MAILCHIMP_AUDIENCE_ID`.
3. Na téže stránce zapněte **Enable double opt-in**. Integrace ho stejně
   vynucuje přes `pending`, ale formuláře Mailchimpu se pak chovají
   stejně.
4. Vyplňte jako odesílatele `info@klidoo.cz`. Kontaktní adresa
   v patičce je zákonná povinnost.

### 3.3 Merge fields
**Audience → Settings → Audience fields and *|MERGE|* tags**:

| Pole | Tag | Typ | Povinné |
|---|---|---|---|
| First Name | `FNAME` | Text | ne (už existuje) |
| Klidoo ID | `KLIDOO_ID` | Text | ne |
| Datum registrace | `REGDATE` | Date (YYYY-MM-DD) | ne |
| Zdroj | `SOURCE` | Text | ne |

Ostatní výchozí pole (`LNAME`, `ADDRESS`, `PHONE`, `BIRTHDAY`) smažte
nebo nechte nepovinná. Integrace je neplní.

### 3.4 Doména odesílatele
**Website → Domains → Add & Verify Domain** `klidoo.cz`. Pak přidejte
DNS záznamy DKIM (CNAME) a DMARC podle průvodce. Bez nich končí
e-maily ve spamu.

### 3.5 Právní věci (brána: vaše schválení)
- DPA: je součástí Mailchimp Terms (Legal → Data Processing Addendum).
  Uložte si PDF.
- Ověřte účast Intuit v EU-US Data Privacy Framework
  (dataprivacyframework.gov).
- Zásady ochrany osobních údajů už Mailchimp uvádějí (v tomto PR).

## 4. Proměnné na serveru

```bash
ssh root@37.27.249.24
cd /opt/klidoo
nano .env
```

Doplňte:
```
MAILCHIMP_API_KEY=<klíč>
MAILCHIMP_AUDIENCE_ID=<ID audience>
MAILCHIMP_ZAPNUTO=
MAILCHIMP_DOUBLE_OPT_IN=1
MAILCHIMP_SMAZANI=trvale
MAILCHIMP_WEBHOOK_TOKEN=<výstup: openssl rand -hex 24>
MAILCHIMP_WEBHOOK_SIGNING_SECRET=
```

`MAILCHIMP_ZAPNUTO` zatím nechte prázdné.

## 5. Nasazení kódu

```bash
cd /opt/klidoo
git pull origin claude/shared-custody-app-cv411b
./deploy/update.sh
docker compose up -d cron-marketing
docker compose ps
```

## 6. Dry-run migrace (bezpečné, jen čte)

```bash
docker compose exec cron-marketing sh -c 'curl -s -H "Authorization: Bearer $CRON_SECRET" "http://app:3000/api/cron/marketing?rezim=migrace&dry=1"'
```

Výsledek je jen počty, např. `{"dryRun":true,"zpusobilych":0,…,"uzivatelu":57,"bezSouhlasu":57}`.
Hned po nasazení je čekané `zpusobilych: 0`: stávající uživatelé
souhlas nedali.

## 7. Zapnutí (brána: vaše schválení)

1. V `.env` nastavte `MAILCHIMP_ZAPNUTO=1`.
2. Spusťte:
   ```bash
   docker compose up -d app cron-marketing
   ```
3. **Test na vlastní adrese:** zaregistrujte se se zaškrtnutým
   souhlasem (nebo ho dejte v Nastavení → E-maily) a do 5 minut
   zkontrolujte:
   - v Mailchimpu je kontakt `Pending`,
   - přišel potvrzovací e-mail,
   - po kliknutí je `Subscribed` a má tagy `klidoo_registered`
     a `klidoo_welcome`.

## 8. Webhook (brána: vaše schválení)

1. **Audience → Settings → Webhooks → Create New Webhook**.
2. Callback URL: `https://klidoo.cz/api/mailchimp/webhook?t=<MAILCHIMP_WEBHOOK_TOKEN>`.
3. **Události:**
   - zaškrtněte Subscribes, Unsubscribes, Cleaned address, Email changed;
   - Profile updates nechte vypnuté.
4. **Zdroje:**
   - zaškrtněte „by a subscriber“ a „by an account admin“;
   - **„via the API“ nechte vypnuté.** Změny z API dělá náš worker,
     ozvěna by jen zatěžovala server. Zpracování je i tak idempotentní.
5. Po uložení Mailchimp **jednou** ukáže signing secret. Vložte ho do
   `MAILCHIMP_WEBHOOK_SIGNING_SECRET` a spusťte
   `docker compose up -d app`.
6. Mailchimp při ukládání ověří adresu požadavkem GET. Odpověď 200 dává
   route, když token sedí.
7. Test: na své testovací adrese klikněte v e-mailu „Unsubscribe“
   a ověřte:
   ```sql
   select souhlas, mc_status, mc_odhlaseno_at from marketing_kontakty
     where mc_email = '<vaše adresa>';
   ```

**Omezení:**
- Webhooky bez signing secret (starší) mají jen token v URL. Token se
  může objevit v logu Caddy, proto je podpis doporučený.
- `fired_at` posílá Mailchimp bez časové zóny. Bereme ho jako UTC,
  slouží jen k řazení.

## 9. Automatizace „Klidoo - Welcome Sequence“ (brána: schválení textů)

**Automations → Customer Journeys → Create journey → Build from
scratch**, název `Klidoo - Welcome Sequence`.

1. **Starting point:** *Tag added* → `klidoo_welcome`. Filtr: Contact
   status is Subscribed.
2. **Kroky:**

| Den | Krok | Předmět (návrh, schválíte) |
|---|---|---|
| 0 | Send email | Vítejte v Klidoo |
| +2 | Time delay 2 days → Send email | První krok k většímu přehledu |
| +4 | Time delay 2 days → Send email | Situace, kterou zná skoro každý rodič |
| +7 | Time delay 3 days → Send email | Méně domlouvání, více jistoty |
| +10 | Time delay 3 days → Send email | Jak vám Klidoo pomáhá? |

3. **Nastavení:**
   - Settings → *Contacts can enter this journey*: **Only once**.
   - Druhá pojistka vedle `welcome_at`.
4. Texty pište ve vykání (slovník značky). Zatím je nepište ani
   neaktivujte: **journey nechte ve stavu Draft**, dokud texty
   neschválíte.

Vícekrokové journeys vyžadují placený tarif Mailchimpu. Viz náklady
níže.

## 10. Ostrá migrace (brána: vaše schválení)

Jen pokud dry-run ukáže něco k přenosu:

```bash
docker compose exec cron-marketing sh -c 'curl -s -H "Authorization: Bearer $CRON_SECRET" "http://app:3000/api/cron/marketing?rezim=migrace&dry=0"'
```

- Ostrá migrace kontakty jen zařadí do fronty. Zbytek udělá worker se
  všemi pojistkami.
- Opakované spuštění nic nezduplikuje.

## Rollback

| Úroveň | Postup |
|---|---|
| Zastavit odesílání | `.env`: `MAILCHIMP_ZAPNUTO=` → `docker compose up -d app cron-marketing`. Úlohy čekají ve frontě |
| Zastavit worker | `docker compose stop cron-marketing` |
| Zastavit webhook | Smazat webhook v Mailchimpu, nebo vyprázdnit `MAILCHIMP_WEBHOOK_TOKEN` (pak vrací 401) |
| Vrátit kód | `git revert <commit>` a `./deploy/update.sh`. Tabulky v DB zůstanou a nevadí |
| Odstranit DB objekty | Nedoporučuji: historie souhlasů je doklad. V nouzi `drop trigger on_auth_user_marketing on auth.users; drop trigger on_auth_user_email_marketing on auth.users;` vypne zápis z registrace |

## Monitoring a řešení chyb

**Poplach e-mailem** (`ADMIN_EMAILS`) přijde při:
- odmítnutém API klíči,
- úloze vzdané po 8 pokusech,
- pádu běhu nebo webhooku.

**Stav fronty:**
```sql
select stav, druh, count(*), max(posledni_chyba) from marketing_fronta group by 1, 2;
```

**Kontakty s chybou:**
```sql
select user_id, mc_status, posledni_chyba, posledni_sync_at from marketing_kontakty
 where posledni_chyba is not null;
```

**Znovu zpracovat vzdané úlohy** (po opravě příčiny):
```sql
update marketing_fronta set stav = 'ceka', pokusy = 0, dalsi_pokus_at = now()
 where stav = 'vzdano' and druh = 'sync'
   and not exists (select 1 from marketing_fronta f2 where f2.user_id = marketing_fronta.user_id
                   and f2.stav = 'ceka' and f2.druh = 'sync');
```

**Ruční běh:**
```bash
docker compose exec cron-marketing sh -c 'curl -s -H "Authorization: Bearer $CRON_SECRET" http://app:3000/api/cron/marketing'
```

**Log:** `docker compose logs --since 1h cron-marketing app | grep -i mailchimp`

## Očekávané provozní náklady

| Položka | Cena |
|---|---|
| Server, databáze | 0 Kč navíc: běží v současném kontejneru a Supabase, jeden HTTP požadavek za 5 minut |
| Mailchimp Free | 0 USD, do 500 kontaktů, ale **neumí vícekrokovou automatizaci** |
| Mailchimp Standard | orientačně kolem 20 USD/měsíc při 500 kontaktech (cena roste s počtem kontaktů); nutný pro pětikrokovou uvítací sekvenci |

Ceny Mailchimpu se mění. Před výběrem tarifu ověřte mailchimp.com/pricing.
Počítají se i odhlášené kontakty, pokud je Mailchimp sám nearchivuje.
