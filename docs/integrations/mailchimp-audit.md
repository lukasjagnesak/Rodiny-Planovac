# Mailchimp: audit současného stavu

Audit z repozitáře (větev `claude/shared-custody-app-cv411b`, migrace
`0001`–`0043`). Do ostré databáze Supabase ani do účtu Mailchimp přístup
není. Schéma v tomto dokumentu je proto schéma z migrací. Skutečný stav
produkce je potřeba ověřit dotazy v kapitole 8.

## 1. Architektura projektu

| Oblast | Skutečný stav |
|---|---|
| Frontend + backend | Next.js 16 (App Router), jeden kontejner `app` (standalone build) |
| Hosting | Hetzner, Docker Compose: `app`, `caddy` (HTTPS), `cron` (alpine + curl), `edupage` |
| Databáze, přihlášení, úložiště | Supabase (hostovaná); aplikace mluví přes `@supabase/supabase-js` |
| Serverové operace | Next API routes v `src/app/api/**`, servisní klíč jen přes `src/lib/supabase/admin.ts` |
| Supabase Edge Functions | **Žádné.** Složka `supabase/functions` neexistuje, Supabase CLI se nepoužívá |
| Database Webhooks / pg_net | **Nepoužívají se** |
| Background jobs | Kontejner `cron` jednou za hodinu volá `GET /api/cron/reminders` s `CRON_SECRET` |
| Secrets | `.env` na serveru (v `.gitignore`), vzor v `.env.example`; Compose ho předává přes `env_file` |
| Migrace | Ruční SQL soubory `supabase/migrations/NNNN_*.sql`, spouštějí se v SQL Editoru Supabase; testují se lokálně `scripts/test-db.sh` |
| Hlášení chyb | `src/lib/poplach.ts`: e-mail správci (`ADMIN_EMAILS`) s omezením 3× za hodinu |

## 2. Účty a e-mailové adresy

### Tabulky

- **`auth.users`** (Supabase): zdroj pravdy o e-mailu (`email`),
  `created_at`, `raw_user_meta_data` (při registraci se tam ukládá
  `full_name`).
- **`profiles`** (`0001_schema.sql`): `id → auth.users(id) on delete cascade`,
  `full_name`, `email`, `avatar_url`, `phone`, `color`, `locale`, `ucet`
  (IBAN, `0037`), `created_at`, `updated_at`.
  - Řádek zakládá trigger `on_auth_user_created` → `handle_new_user()` (`security definer`).
  - `profiles.email` je **kopie z okamžiku registrace**. Při změně e-mailu v `auth.users` se nic nepřepisuje.
- **`family_members`**: `family_id`, `user_id → profiles`, `role`
  (owner/parent/guardian/viewer…). Rodina je samostatný objekt, uživatel
  může být ve více rodinách.
- **`predplatna`**: jedno předplatné na rodinu, `stav`
  (`zkusebni`/`aktivni`/`po_splatnosti`/`zruseno`/`vyprsel`),
  `stripe_subscription_id`.

### RLS

- `profiles`: SELECT vlastní řádek a členové stejné rodiny, UPDATE jen vlastní.
- `leady`, `lead_sekvence_kroky`, `mail_odhlaseni`: RLS zapnuté, **bez politik**, takže přístup má jen servisní klíč.

## 3. Registrace a ověření e-mailu

1. **E-mail + heslo:** formulář
   `src/app/(registrace)/registrace/register-form.tsx` volá v prohlížeči
   `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`.
2. **Ověření e-mailu:** když je v Supabase zapnuté potvrzení e-mailu
   (kód s tím počítá: `if (!data.session)`), uživatel dostane potvrzovací
   odkaz. Odkaz vede na `/auth/callback`, kde
   `exchangeCodeForSession` vytvoří session. Jestli je potvrzení
   v produkci zapnuté, z repozitáře nejde poznat.
3. **Google (Apple až po Developer Programu):** `signInWithOAuth`, návrat
   přes `/auth/callback`. Do metadat nelze z formuláře nic přidat.
4. **Pozvánka:** stejný formulář s `inviteToken`, po registraci
   `/pozvanka/[token]`.
5. Profil vzniká triggerem, rodina vzniká až v průvodci `/vitejte`.
6. **Změna e-mailu:** aplikace pro ni **nemá UI**
   (`supabase.auth.updateUser` se nikde nevolá). Obnova hesla také chybí.

## 4. Stávající e-mailová komunikace

- **Odesílání:** vlastní SMTP přes nodemailer (`src/lib/mail.ts`):
  pozvánky, předplatné, připomínky, poplach.
- **Kontakty z webu:** tabulka `leady` (`0014`), formulář
  `src/components/web/lead-form.tsx`, endpoint `/api/lead`.
- **Sekvence:** `lead_sekvence_kroky` (`0026`) a
  `src/lib/sekvence-odesilani.ts`. Hodinový cron rozesílá jednu
  „děkovnou“ zprávu ke vzoru dohody. Jedinečnost hlídá
  `unique (lead_id, sekvence, krok)`.
- **Odhlášení:** tabulka `mail_odhlaseni (email PK, duvod, odhlaseno_at)`
  a stránka `/odhlasit?e=…&t=…`. Odkaz je podepsaný HMAC
  (`src/lib/odhlaseni.ts`) a funguje bez přihlášení jedním kliknutím.
- **Newsletter ani žádná integrace s Mailchimpem neexistuje.**

## 5. Marketingové souhlasy: současný stav

| # | Otázka | Zjištění |
|---|---|---|
| 1 | Checkbox pro marketing při registraci? | **Ne.** Registrace obsahuje jen jméno, e-mail a heslo |
| 2 | Nepředvyplněný a dobrovolný? | Neexistuje |
| 3 | Ukládá se souhlas do DB? | **Ne** pro uživatele aplikace |
| 4 | Čas udělení? | Ne |
| 5 | Verze textu souhlasu? | Ne |
| 6 | Lze souhlas odvolat? | Jen globálně přes `/odhlasit` (tabulka `mail_odhlaseni`), bez vazby na účet |
| 7 | Nastavení marketingu v profilu? | **Ne** (`/nastaveni` má profil, předplatné, střídání, notifikace…) |
| 8 | Jak se eviduje odhlášení? | `mail_odhlaseni` podle e-mailu (malými písmeny, vynucuje trigger) |

**Závěr:**
- Pro registrované uživatele dnes **neexistuje žádný doložený právní
  základ** pro marketingové e-maily.
- Registrace souhlasem není a za souhlas nelze považovat ani přijetí
  obchodních podmínek.
- Při spuštění integrace **nesmí být importován žádný stávající
  uživatel**. Jediný zdroj kontaktů pro Mailchimp jsou souhlasy udělené
  po nasazení.

**Formuláře na webu (`leady`):**
- Pod formulářem je text „Pošleme vám materiál a k tomu pár zpráv o tom,
  jak Klidoo pomáhá…“.
- Souhlas je tedy spojený se stažením materiálu a nemá samostatný
  checkbox.
- Zásady ochrany údajů ho vedou jako „souhlas“ s dobou 3 roky.
- **Pro Mailchimp newsletter ho nepoužívám.** Je vázaný na jiný účel
  (materiál a pár zpráv ke službě), nemá doloženou verzi textu ani čas
  zobrazení textu. Leady proto v integraci nejsou.

## 6. Bezpečnostní a GDPR rizika

1. **Žádný souhlas u uživatelů.** Jakýkoli hromadný import by byl
   rozesílání obchodních sdělení bez souhlasu (zákon 480/2004 Sb., § 7).
   Řešení: nová evidence a migrace jen pro doložené souhlasy.
2. **Cizí adresa při registraci.** Pokud je v Supabase vypnuté
   potvrzení e-mailu, kdokoli může zaregistrovat cizí adresu
   a zaškrtnout souhlas. Řešení: **double opt-in v Mailchimpu je ve
   výchozím stavu zapnutý.**
3. **Předání do USA.** Mailchimp provozuje Intuit Inc. (USA). Je potřeba:
   - doplnit zpracovatele do zásad ochrany osobních údajů (připraveno
     v tomto PR),
   - uzavřít DPA s Mailchimpem (je součástí jeho podmínek),
   - ověřit účast v EU-US Data Privacy Framework.
4. **Odhlášení na dvou místech.** Přes `/odhlasit` (náš SMTP) i přes
   Mailchimp. Musí se propisovat oběma směry, jinak člověk „odhlášený“
   jinde dostává zprávy dál.
5. **Smazání účtu** (`src/lib/mazani.ts` → `auth.admin.deleteUser`)
   dnes kaskádou smaže profil. Kontakt v Mailchimpu by zůstal. Řešení:
   úloha na výmaz ve frontě se zakládá triggerem ještě před smazáním
   řádku.
6. **`profiles.email` zastarává.** Pro marketing se musí číst
   `auth.users.email`.
7. **Souběh.** Cron, okamžité zpracování a webhook mohou běžet zároveň.
   Řešení: `for update skip locked`, idempotentní upsert a jedno
   uvítání vynucené v DB.
8. **Drobnost mimo rozsah:** `/api/lead` vrací hlášku v tykání („Dej
   tomu chvilku“). Opraveno v tomto PR.

## 7. Navrhovaná architektura (shrnutí)

Podrobně v `mailchimp-architecture.md`.

```
Registrace / Nastavení / Google callback / odhlašovací odkaz
        │  (RPC nebo trigger na auth.users)
        ▼
marketing_kontakty ──trigger──► marketing_fronta  (outbox, ve stejné transakci)
        ▲                               │
        │                               ▼  každých 5 min kontejner cron-marketing
        │                     /api/cron/marketing  (Next, servisní klíč)
        │                               │  idempotentní upsert, tagy, backoff
        │                               ▼
        │                     Mailchimp Marketing API
        │                               │
        └────── /api/mailchimp/webhook ◄┘  (odhlášení, cleaned, upemail, subscribe)
```

**Proč ne Supabase Edge Functions:**
- Projekt žádné Edge Functions nemá a nemá ani pipeline na jejich
  nasazení (Supabase CLI, `supabase/functions`).
- Všechna serverová logika, tajemství, poplach a cron jsou v Next.js na
  Hetzneru.
- Edge Function by přidala druhé běhové prostředí (Deno), druhé místo
  pro tajemství a druhý způsob nasazení.
- Spolehlivost dodává transakční outbox v Postgresu, ne místo, kde běží
  kód.
- Supabase Database Webhooks (pg_net) neposkytují opakování ani potvrzení
  doručení. Outbox ano.

**Kde jsou tajemství:** Mailchimp klíč je v `.env` na serveru, stejně jako
Stripe a SMTP. Ne v gitu a ne v klientském JS (bez prefixu `NEXT_PUBLIC_`).

## 8. Seznam nezbytných změn

1. Migrace `0044_marketing_souhlasy.sql`:
   - verze textů souhlasu,
   - stav kontaktu,
   - auditní historie (jen přidávání),
   - fronta,
   - deduplikace webhooků,
   - triggery a RPC.
2. Checkbox v registraci (e-mail i Google) a stránka `/nastaveni/e-maily`.
3. Worker `/api/cron/marketing`: synchronizace, průběžná rekonciliace
   a jednorázová migrace s dry-run.
4. Webhook `/api/mailchimp/webhook`: token v URL a volitelně HMAC podpis
   Mailchimpu.
5. `/odhlasit` nově odvolá i marketingový souhlas účtu.
6. Kontejner `cron-marketing` v `docker-compose.yml`.
7. Proměnné `MAILCHIMP_*` v `.env.example`.
8. Zásady ochrany osobních údajů: nový zpracovatel a účel.

## 9. Rizika migrace stávajících kontaktů

- **Stávající uživatelé nemají souhlas.** Migrace jich proto vybere
  **0**. To je správně, nejde o chybu.
- Oslovit je e-mailem s prosbou o souhlas by samo bylo obchodní
  sdělení. Souhlas lze získat jen v aplikaci (stránka Nastavení →
  E-maily) a při další registraci.
- Kontakt, který už v Audience existuje a je `unsubscribed` nebo
  `cleaned`, migrace přeskočí a nic mu nemění.
- **Trvale smazané kontakty** (GDPR výmaz v Mailchimpu) nejde přes API
  znovu přidat. Mailchimp vrací chybu „Forgotten Email Not Subscribed“.
  Úloha skončí jako `vzdano` s popisem a nic se nerozešle.

## 10. Chybějící konfigurace a přístupy

| Co | Kdo | Kde |
|---|---|---|
| Mailchimp API klíč | Vy | Mailchimp → Profile → Extras → API keys |
| Audience ID „Klidoo“ | Vy | Audience → Settings → Audience name and defaults |
| Merge fields `KLIDOO_ID`, `REGDATE`, `SOURCE` | Vy (návod v setup) | Audience → Settings → Audience fields |
| Webhook + signing secret | Vy, až po nasazení | Audience → Settings → Webhooks |
| DPA a DPF Mailchimpu | Vy | Mailchimp Legal |
| Ověření domény odesílatele (SPF/DKIM pro klidoo.cz) | Vy | Mailchimp → Domains |
| Je v Supabase zapnuté „Confirm email“? | Vy | Supabase → Authentication → Sign In / Providers → Email |
| Ostrá DB: počet uživatelů, skutečné schéma | Vy | dotazy v `mailchimp-setup.md`, kap. 1 |
