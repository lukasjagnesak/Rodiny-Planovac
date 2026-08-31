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
| `0020_opakovane_vydaje.sql` | pravidelné výdaje a index proti zdvojení | opakované výdaje nepůjdou založit |
| `0021_provoz.sql` | měření návštěvnosti a trychtýře | `/provoz` bude prázdný a měření spadne do logu |

## 2. Proměnné v `.env` (na serveru)

```bash
ssh <server>
cd ~/klidoo                      # tam, kde je docker-compose.yml
bash deploy/doplnit-env.sh       # přidá chybějící klíče, staré nepřepíše
nano .env
```

Doplň to, co skript přidal prázdné — popis každé položky je v `.env.example`:

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

# Interní přehled provozu
ADMIN_EMAILS=info@klidoo.cz
PROVOZ_SUL=<openssl rand -hex 16>

# Marketingové měření — načte se až po souhlasu návštěvníka
NEXT_PUBLIC_GA_ID=G-…
NEXT_PUBLIC_META_PIXEL_ID=…
```

> `NEXT_PUBLIC_*` se zapékají do buildu, takže po jejich změně nestačí
> restart — musí se přestavět obraz. `deploy/update.sh` to dělá vždy.

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
bash deploy/kontrola.sh tvuj@email.cz
```

Projde veřejné stránky, ověří, že se nepřihlášený nedostane do aplikace,
že Stripe webhook bez podpisu nic nepustí, otestuje SMTP a pošle zkušební
zprávu. Co skript ověřit neumí, zbývá ručně:

- [ ] `/cenik` ukazuje 199 Kč a 1 990 Kč
- [ ] v aplikaci `/predplatne` sedí zbývající dny zkušebního období
- [ ] zkušební platba v testovacím režimu Stripe projde a stav se přepne
      na „aktivní" (to potvrdí, že webhook dorazil)
- [ ] pozvánka druhému rodiči přijde e-mailem
- [ ] v **Nastavení** je dole sekce „Konec s Klidoo"
- [ ] u výdaje jde zaškrtnout „Opakuje se pravidelně" a šablona se objeví
      v kartě „Pravidelné výdaje"
- [ ] `/provoz` se otevře tobě a komukoli jinému vrátí 404
- [ ] při první návštěvě webu se ukáže lišta se souhlasem; po „Jen nutné"
      se v síti neobjeví žádné volání na google ani facebook
- [ ] po „Přijmout vše" naskočí GA4 v real-time přehledu a Meta Pixel
      v Events Manageru

## 5. Co se dělá jen jednou (mimo server)

- [ ] **Stripe → Webhooks**: endpoint `https://klidoo.cz/api/stripe/webhook`,
      události `checkout.session.completed`, `customer.subscription.*`
      (včetně `customer.subscription.trial_will_end`), `invoice.paid`,
      `invoice.payment_failed`. Podpisové tajemství patří do
      `STRIPE_WEBHOOK_SECRET`.
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
