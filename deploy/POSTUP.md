# Nasazení: postup krok za krokem

Aktualizace běžící instance na klidoo.cz. Celé to trvá zhruba deset minut,
z toho většinu zabere build.

> **Pořadí není libovolné.** Migrace musí být v databázi dřív, než naběhne
> nová verze aplikace, a proměnné v `.env` dřív, než se staví obraz —
> `NEXT_PUBLIC_*` se zapékají do buildu.

---

## 1. Databáze (Supabase → SQL Editor)

Spusť migrace, které ještě neproběhly, v tomhle pořadí. Každá je psaná tak,
aby ji šlo pustit i podruhé, takže když si nejsi jistý, pusť ji znovu.

| Migrace | Co dělá | Bez ní |
|---|---|---|
| `0017_predplatne.sql` | tabulka `predplatna`, zkušební období 30 dní | aplikace spadne na chybějící tabulce |
| `0018_paywall.sql` | paywall v RLS | po vypršení by šlo dál zapisovat |
| `0019_predplatne_pripominka.sql` | datum poslední připomínky | e-mail o konci trialu by chodil každou hodinu |

## 2. Proměnné v `.env` (na serveru)

```bash
ssh <server>
cd ~/klidoo          # tam, kde je docker-compose.yml
nano .env
```

Doplň to, co chybí — popis každé položky je v `.env.example`:

```bash
# Platby
STRIPE_SECRET_KEY=sk_live_…
STRIPE_PRICE_MESICNI=price_…
STRIPE_PRICE_ROCNI=price_…
STRIPE_WEBHOOK_SECRET=whsec_…

# E-maily (postup v README, kapitola 5b)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_…
SMTP_FROM_NAME=Klidoo
SMTP_FROM_EMAIL=info@klidoo.cz
SMTP_REPLY_TO=info@klidoo.cz
```

Pozor na dvě věci, které skript hlídá a které tiše rozbijí celý start:
hodnoty **nedávej do uvozovek** a **nepiš do nich `< > | ; & $ ( )`**.

## 3. Nasazení

```bash
bash deploy/update.sh
```

Skript stáhne změny, upozorní na nové migrace i na proměnné, které v `.env`
chybí oproti `.env.example`, přestaví obraz, restartuje a počká, až aplikace
naběhne. Když do minuty nenaběhne, vypíše, kde je log.

## 4. Kontrola po nasazení

```bash
# aplikace žije
curl -sI https://klidoo.cz | head -1

# ceník je veřejně dostupný (nesmí přesměrovat na přihlášení)
curl -sI https://klidoo.cz/cenik | head -1

# SMTP: spojení a zkušební zpráva
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://klidoo.cz/api/mail/kontrola?komu=tvuj@email.cz"
```

Ručně pak:

- [ ] `/cenik` ukazuje 199 Kč a 1 990 Kč
- [ ] v aplikaci `/predplatne` sedí zbývající dny zkušebního období
- [ ] zkušební platba v testovacím režimu Stripe projde a stav se přepne
      na „aktivní" (to potvrdí, že webhook dorazil)
- [ ] pozvánka druhému rodiči přijde e-mailem
- [ ] v **Nastavení** je dole sekce „Konec s Klidoo"

## 5. Co se dělá jen jednou (mimo server)

- [ ] **Stripe → Webhooks**: endpoint `https://klidoo.cz/api/stripe/webhook`,
      události `checkout.session.completed`, `customer.subscription.*`,
      `invoice.paid`, `invoice.payment_failed`. Podpisové tajemství patří
      do `STRIPE_WEBHOOK_SECRET`.
- [ ] **Supabase → Authentication → Emails → SMTP**: stejné údaje jako v `.env`.
      Do té doby chodí přihlašovací e-maily ze Supabase, s jejich limitem
      pár zpráv za hodinu.
- [ ] **Supabase → Authentication → Providers → Google**: zapnout,
      redirect URI `https://klidoo.cz/auth/callback`.
- [ ] **DNS**: SPF, DKIM a DMARC — bez nich pozvánky končí ve spamu.

## Když se to pokazí

Aplikace nenaběhne:

```bash
docker compose logs --tail=80 app
```

Návrat na předchozí verzi (`git log --oneline` napoví, na kterou):

```bash
git reset --hard <sha předchozí verze>
docker compose up -d --build
```

**Migrace zpět nevrací.** Jsou psané tak, aby starší verze aplikace
s novou databází běžela dál — přidávají, nemažou.
