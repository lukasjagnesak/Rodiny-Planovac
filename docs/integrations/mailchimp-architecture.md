# Mailchimp: architektura

## Princip

**Supabase je zdroj pravdy o souhlasu, Mailchimp je kanál.**
- Každá změna souhlasu nejdřív vznikne v databázi, i s auditní stopou.
- Do Mailchimpu ji promítne worker.
- Co se stane v Mailchimpu (odhlášení, nedoručitelnost, změna adresy),
  se vrací webhookem zpátky.

```
 ┌────────────── Klidoo (Next.js na Hetzneru) ──────────────┐
 │                                                          │
 │  /registrace ── signUp(metadata) ──► auth.users ─┐       │
 │  Google ─► /auth/callback ── RPC ────────────────┤       │
 │  /nastaveni/e-maily ─► /api/marketing/souhlas ───┤       │
 │  /odhlasit ── RPC marketing_odhlasit_email ──────┤       │
 │                                                  ▼       │
 │                     ┌──────── Supabase Postgres ───────┐ │
 │                     │ marketing_kontakty   (stav)      │ │
 │                     │ marketing_souhlasy_historie      │ │
 │                     │ marketing_fronta     (outbox)  ◄─┼─┼─ triggery: souhlas, jméno,
 │                     │ marketing_webhook_udalosti       │ │  e-mail účtu, předplatné,
 │                     └──────────────┬───────────────────┘ │  smazání kontaktu
 │                                    │ for update skip locked
 │  cron-marketing (5 min) ─► /api/cron/marketing ──┐       │
 │  after() po změně souhlasu ──────────────────────┤       │
 │                                                  ▼       │
 │                          src/lib/mailchimp/synchronizace │
 └──────────────────────────────────┬───────────────────────┘
                                    │ HTTPS, Basic auth (klíč z .env)
                                    ▼
                       Mailchimp Marketing API v3
                                    │ webhook (token + HMAC podpis)
                                    ▼
                       /api/mailchimp/webhook ─► RPC marketing_mailchimp_udalost
```

### Proč tahle cesta, a ne Edge Functions nebo Database Webhooks
- Projekt nemá Edge Functions, Supabase CLI ani `supabase/functions`.
  Všechna serverová logika, `.env`, poplach a cron jsou v Next.js.
  Druhé prostředí (Deno, Supabase Secrets, jiné nasazení) by přidalo
  údržbu bez přínosu.
- **Transakční outbox:** úloha vzniká ve stejné transakci jako změna.
  Database Webhook (pg_net) odešle požadavek jednou, neopakuje ho
  a o neúspěchu nedá vědět. Outbox čeká, dokud úlohu worker neodškrtne.
- Žádná další placená služba (Make, Zapier).

## Datový model (migrace `0044_marketing_souhlasy.sql`)

| Tabulka | Účel | RLS |
|---|---|---|
| `marketing_souhlas_texty` | Verze textu souhlasu (`2026-11-v1`). Text se nemění, jen přibývají verze | čtení pro všechny |
| `marketing_kontakty` | Jeden řádek na uživatele, který se kdy vyjádřil: `souhlas`, `souhlas_verze`, `souhlas_at`, `odvolano_at`, `zdroj`; stav v Mailchimpu `mc_status`, `mc_email`, `mc_odhlaseno_at`; `ucet_email_sync`, `welcome_at`, `posledni_sync_at`, `posledni_chyba` | SELECT vlastní řádek, zápis jen přes RPC |
| `marketing_souhlasy_historie` | Auditní stopa: `udelen`, `odvolan`, `odhlasen_odkazem`, `odhlasen_v_mailchimpu`, `potvrzen_double_opt_in`, `cleaned`, `email_zmenen_v_mailchimpu` + verze, zdroj, čas | SELECT vlastní; UPDATE/DELETE blokuje trigger |
| `marketing_fronta` | Outbox: `sync` / `smazat`, `stav`, `pokusy`, `dalsi_pokus_at`, `posledni_chyba` | jen servisní klíč |
| `marketing_webhook_udalosti` | Deduplikace webhooků (sha256 těla) | jen servisní klíč |

### Minimalizace údajů
- **Do Mailchimpu jde jen:**
  - e-mail,
  - `FNAME` (první slovo jména),
  - `KLIDOO_ID` (UUID účtu),
  - `REGDATE` (datum),
  - `SOURCE` (`registrace` / `registrace-google` / `pozvanka` / `nastaveni`),
  - tagy.
- **Nikdy nejdou:** děti, rodina, kalendář, výdaje ani role.
- Historie neukládá IP adresu ani e-mail, jen vazbu na účet. Po smazání
  účtu zůstane anonymní (`user_id = null`).

### Vazby
- `marketing_kontakty.user_id → profiles.id` (`on delete cascade`).
- Před smazáním řádku trigger zařadí úlohu `smazat` s adresou.
- `marketing_fronta` schválně nemá cizí klíč, aby úloha na výmaz
  přežila smazání účtu. Po dokončení se adresa z úlohy vymaže.

## Toky

### A) Registrace
1. **E-mail:** zaškrtnutý checkbox přidá do `signUp` metadata
   `marketing_souhlas`, `marketing_verze`, `marketing_zdroj`.
   - Trigger `on_auth_user_marketing` (běží po `on_auth_user_created`)
     ověří verzi a založí kontakt i historii.
   - Chyba v triggeru registraci neshodí.
2. **Google:** metadata přes OAuth přidat nejde. Formulář nastaví
   cookie `klidoo_marketing` (15 minut) a `/auth/callback` po výměně
   kódu zavolá `nastav_marketing_souhlas` pod přihlášeným uživatelem.
3. **Bez zaškrtnutí** nevznikne nic a uživatel se do Mailchimpu nedostane.

### B) Změna údajů
- Trigger na `profiles.full_name` a na `auth.users.email` zařadí
  synchronizaci, ale jen kontakty se souhlasem nebo přihlášené.
- Supabase mění `auth.users.email` až po potvrzení nové adresy, takže se
  neověřená adresa do Mailchimpu nedostane.
- Worker pozná změnu podle `ucet_email_sync` a kontakt přesune
  (`PATCH email_address`). Když nová adresa v Audience už je, starý
  kontakt odhlásí a řídí se stavem nové adresy.

### C) Udělení souhlasu
- **Double opt-in je výchozí** (`MAILCHIMP_DOUBLE_OPT_IN=1`).
- Nový kontakt dostane `status_if_new: pending` a Mailchimp mu pošle
  potvrzovací e-mail.
- Po potvrzení přijde webhook `subscribe`. Ten zapíše
  `potvrzen_double_opt_in` a zařadí synchronizaci, která přidá tagy
  a uvítání.

### D) Odvolání
- `/nastaveni/e-maily` nebo `/odhlasit` nastaví `souhlas=false`
  a `odvolano_at`.
- Worker pošle `PATCH status: unsubscribed`.
- Odkaz `/odhlasit` z vlastních e-mailů platí i pro Mailchimp.

### E) Odhlášení v Mailchimpu
- Webhook `unsubscribe` nastaví `souhlas=false`, `mc_status=unsubscribed`
  a `mc_odhlaseno_at`, a zapíše historii.
- Adresu přidá i do `mail_odhlaseni`, takže skončí i vlastní obchodní
  sekvence.
- **Žádné automatické znovupřihlášení:**
  - Úprava profilu kontakt bez souhlasu nezařadí.
  - I kdyby úloha proběhla, `rozhodni()` u stavu `unsubscribed` nic
    nezapíše.
  - Když webhook nedorazí, worker odhlášení najde při synchronizaci
    a souhlas v Klidoo ukončí sám.
- Znovu přihlásit jde jen novým souhlasem v Klidoo, který je novější
  než odhlášení. I tehdy jen přes `pending`, tedy potvrzovací e-mail.
  Přímé `subscribed` by Mailchimp stejně odmítl („Member In Compliance
  State“).

### F) Smazání účtu
- `smazUcet` → `auth.admin.deleteUser` → kaskádně smaže
  `marketing_kontakty`. Trigger zařadí úlohu `smazat`.
- **Výchozí je trvalý výmaz** (`actions/delete-permanent`, GDPR).
  Mailchimp pak adresu přes API už nepřijme. Pokud se člověk znovu
  zaregistruje, úloha skončí `vzdano` s hláškou „Forgotten Email Not
  Subscribed“ a znovu se přihlásit může jen přes formulář Mailchimpu.
  Alternativa je `MAILCHIMP_SMAZANI=archivovat`.
- Historie souhlasů zůstane anonymně.
- Údaje pro účetnictví (předplatné, Stripe) se řídí `mazani.ts`,
  marketing do nich nesahá.

## Pravidla upsertu (čistá funkce `rozhodni`)

| Souhlas v Klidoo | Stav v Mailchimpu | Akce |
|---|---|---|
| ne | subscribed/pending, odvolání novější než `last_changed` | `odhlas` |
| ne | subscribed/pending bez našeho odvolání | nic (přihlásil se přímo u Mailchimpu) |
| ano | neexistuje | `PUT` + `status_if_new: pending` (nebo `subscribed` bez DOI) |
| ano | subscribed / pending | `PUT` jen s `merge_fields`, **bez `status`** |
| ano | unsubscribed, souhlas starší | nic + ukončit souhlas v Klidoo |
| ano | unsubscribed, souhlas novější | `PUT status: pending` |
| ano | cleaned | nic |
| ano | archived / transactional | `PUT status: pending` (nebo `subscribed`) |

## Tagy

| Tag | Kdy | Ověřitelný zdroj |
|---|---|---|
| `klidoo_registered` | každý `subscribed` kontakt se souhlasem | účet existuje |
| `klidoo_welcome` | **jednou**, po stavu `subscribed` | `welcome_at` (DB, zabírá se před voláním API) + tag už v Mailchimpu |
| `klidoo_premium` | active/inactive podle `predplatna.stav = 'aktivni'` | Stripe → `predplatna` |
| `klidoo_active`, `klidoo_inactive` | **zatím se nenastavují** | viz níže |

`klidoo_active`/`klidoo_inactive`:
- Aplikace nemá spolehlivou událost aktivity.
- `auth.users.last_sign_in_at` se při obnově session nemění, takže by
  aktivní uživatele označil za neaktivní.
- Konstanty jsou připravené v `TAGY`. Zapnout je má smysl až s měřením
  aktivity (balíček 3: aktivace a retence).

Tagy se posílají s `is_syncing: false`, takže **smí spustit
automatizaci**. Na tom stojí uvítací sekvence.

## Bezpečnost a spolehlivost

| Požadavek | Řešení |
|---|---|
| API klíč | `.env` na serveru, bez `NEXT_PUBLIC_`. Test hlídá, že žádný klientský soubor neimportuje serverovou část |
| Secrets v gitu | `.env` je v `.gitignore`, v repu jen prázdné `.env.example` |
| Ověření webhooku | Token v URL (vždy povinný, porovnání v konstantním čase) + HMAC `X-Mailchimp-Signature`, povinný, je-li nastaven signing secret |
| Replay | Podpis starší než 5 minut se odmítá; sha256 těla v `marketing_webhook_udalosti` |
| Duplicitní kontakty | Upsert na MD5 hash adresy; jedna čekající úloha na uživatele (unikátní index) |
| Idempotence | Úloha čte aktuální stav, nenese „změnu“ |
| Souběh | `marketing_fronta_vezmi` s `for update skip locked`; uvítání zabrané podmíněným UPDATE |
| Retry | Exponenciální odstup 1, 2, 4 … min, nejvýš 6 h; po 8 pokusech `vzdano` + poplach |
| Rate limit | Postupné zpracování (Mailchimp: max 10 souběžných spojení); při 429 se běh přeruší a zbytek čeká minutu |
| Chybný klíč | 401/403 zastaví běh, poplach správci, úlohy zůstanou ve frontě |
| Trvalé chyby | 4xx (kromě 401/403/429) → `vzdano` hned + `posledni_chyba` u kontaktu |
| Reconciliace | Každý běh zařadí až 20 kontaktů, které se den nesynchronizovaly. Synchronizace čte stav z Mailchimpu, takže zachytí i ztracené webhooky |
| Logy | Do logu ani poplachu nejde klíč ani e-mail; jen ID úlohy a hláška Mailchimpu |
| RLS | Nové tabulky mají RLS; worker a webhook jen servisní klíč; uživatel mění souhlas jen přes `nastav_marketing_souhlas` (`auth.uid()`) |

## Změněné a nové soubory

**Nové:**
- `supabase/migrations/0044_marketing_souhlasy.sql`
- `src/lib/marketing-souhlas.ts`: text a verze souhlasu, název cookie
- `src/lib/mailchimp/klient.ts`: Marketing API v3
- `src/lib/mailchimp/synchronizace.ts`: `rozhodni`, `zpracujFrontu`, `migrace`
- `src/lib/mailchimp/webhook.ts`: token, HMAC, parsování
- `src/lib/mailchimp/server.ts`: nastavení z `.env` a úložiště nad Supabase
- `src/lib/mailchimp/beh.ts`: jeden běh fronty a poplach
- `src/app/api/cron/marketing/route.ts`: fronta, reconciliace, migrace
- `src/app/api/mailchimp/webhook/route.ts`
- `src/app/api/marketing/souhlas/route.ts`
- `src/app/(app)/nastaveni/e-maily/page.tsx`
- `src/components/settings/marketing-souhlas.tsx`
- `tests/mailchimp.test.js`, `tests/db/marketing.sql`
- `docs/integrations/mailchimp-*.md`

**Změněné:**
- `src/app/(registrace)/registrace/register-form.tsx`: checkbox, metadata, cookie pro Google
- `src/app/auth/callback/route.ts`: souhlas z cookie
- `src/app/odhlasit/page.tsx`: odvolá i marketingový souhlas
- `src/app/(app)/nastaveni/page.tsx`: odkaz „E-maily“
- `src/app/(web)/zasady-ochrany-osobnich-udaju/page.tsx`: Mailchimp jako zpracovatel, nový účel
- `src/proxy.ts`: `/api/mailchimp/webhook` je veřejný (chrání se sám)
- `src/app/api/lead/route.ts`: oprava tykání v hlášce
- `docker-compose.yml`: služba `cron-marketing`
- `.env.example`: proměnné `MAILCHIMP_*`
- `package.json`: `test:mailchimp`
