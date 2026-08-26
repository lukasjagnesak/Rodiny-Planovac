# Rodinný plánovač

Webová aplikace pro rodiny ve střídavé péči. Kalendář, kdo má kdy děti, kroužky
a plán dopravy, výdaje s fotkami účtenek, školní i lékařské události — a všechno
sdílené s druhým rodičem, prarodiči nebo kýmkoli dalším, koho pozvete.

Optimalizované pro mobil (PWA — dá se přidat na plochu), funguje i na desktopu.

---

## Co aplikace umí

| Oblast | Popis |
|---|---|
| **Kalendář péče** | Vzory střídání (po týdnu, 2‑2‑3, vlastní rozpis, trvale u jednoho rodiče), ruční výjimky na jednotlivé dny, barevné odlišení rodičů, počítání nocí za měsíc i za rok |
| **Kroužky** | Opakující se termíny, místo, cena, sezóna. Ke každému termínu se přiřazuje, **kdo veze tam a kdo zpět** — a řidiči přijde připomínka |
| **Události** | Škola v přírodě, třídní schůzky, focení, školní výlety, lékařské prohlídky, narozeniny. Vlastní připomínky u každé události |
| **Výdaje** | Výživné, kroužky, oblečení, škola, zdraví… Fotka účtenky přímo z foťáku, rozdělení nákladů mezi rodiče, přehled kdo komu dluží |
| **Přehled** | Kdo má dnes děti, kolik se letos utratilo za které dítě, poměr nocí matka/otec, nejbližší doprava a události |
| **Google kalendář** | Každý člen si propojí **svůj** účet; péče, kroužky i události se přenesou do jeho kalendáře |
| **EduPage** | Úkoly, písemky a školní akce ze školního systému (jen rodinná verze) |
| **Telegram** | Připomínky zdarma přímo do telefonu — kdo zítra veze, kdy je předání, co se blíží |
| **Rodina** | Pozvánky odkazem, role (správce / rodič / pečující osoba / jen pro čtení), vlastní barvy |

### Proč Telegram a ne WhatsApp

WhatsApp Cloud API vyžaduje ověřený Meta Business účet, schvalování šablon zpráv
a placené konverzace. Telegram bot se založí za dvě minuty přes `@BotFather`,
je zdarma a bez limitů na tento typ použití. Rozhraní je oddělené v
`src/lib/telegram.ts`, takže WhatsApp jde doplnit později jako druhý kanál.

---

## Technologie

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS 4
- **Supabase** — Postgres, autentizace, Storage na účtenky, Row Level Security
- **Docker + Caddy** — nasazení na Hetzner s automatickým HTTPS

---

## Zprovoznění krok za krokem

### 1. Supabase

1. Založ projekt na [supabase.com](https://supabase.com) (region **Frankfurt** je
   z Česka nejrychlejší).
2. V **SQL Editoru** spusť postupně soubory z `supabase/migrations/`:
   - `0001_schema.sql` — tabulky
   - `0002_rls.sql` — zabezpečení a RPC funkce
   - `0003_storage.sql` — úložiště na účtenky
3. V **Project Settings → API** si zkopíruj:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` klíč → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` klíč → `SUPABASE_SERVICE_ROLE_KEY` *(tenhle nikdy nikam nedávej veřejně)*
4. V **Authentication → URL Configuration** nastav:
   - Site URL: `https://planovac.tvoje-domena.cz`
   - Redirect URLs: `https://planovac.tvoje-domena.cz/auth/callback`

> Data jsou chráněná na úrovni databáze. I kdyby někdo získal `anon` klíč,
> uvidí jen rodiny, jejichž je členem — hlídá to RLS, ne aplikace.

### 2. Lokální vývoj

```bash
git clone <adresa-repozitáře>
cd Rodiny-Planovac
npm install
cp .env.example .env.local     # doplň klíče ze Supabase
npm run dev                    # http://localhost:3000
```

Vygeneruj si klíč pro šifrování Google tokenů:

```bash
openssl rand -base64 32        # → TOKEN_ENCRYPTION_KEY
```

Při prvním přihlášení tě aplikace provede založením rodiny, přidáním dětí
a nastavením střídání.

### 3. Google kalendář (nepovinné)

1. [Google Cloud Console](https://console.cloud.google.com) → nový projekt
2. **APIs & Services → Library** → zapni **Google Calendar API**
3. **OAuth consent screen** → typ *External*, přidej sebe a ostatní členy rodiny
   jako testovací uživatele (aplikace nemusí procházet ověřením, dokud ji
   používá jen rodina)
4. **Credentials → Create credentials → OAuth client ID → Web application**
   - Authorized redirect URI: `https://planovac.tvoje-domena.cz/api/google/callback`
   - lokálně navíc: `http://localhost:3000/api/google/callback`
5. `Client ID` a `Client secret` doplň do `.env`

Propojení pak proběhne v aplikaci v **Nastavení → Google kalendář**. Refresh
token se do databáze ukládá zašifrovaný (AES‑256‑GCM).

### 4. EduPage (nepovinné, jen rodinná verze)

EduPage nemá veřejné API. Aplikace proto mluví s vedlejší službou ve složce
`edupage/`, která napodobuje mobilní aplikaci pomocí knihovny `edupage-api`.
Je to samostatný kontejner — v komerčním nasazení ho prostě nespouštěj.

```bash
# do .env
EDUPAGE_SIDECAR_URL=http://edupage:8000
EDUPAGE_SIDECAR_SECRET=$(openssl rand -hex 24)
```

Propojení pak proběhne v aplikaci v **Nastavení → EduPage**. Každý rodič
zadává vlastní přihlašovací údaje; heslo se ukládá zašifrované a nikdo ho
nemusí sdílet s druhým rodičem. Stažené úkoly ale vidí celá rodina.

Co se stáhne: úkoly, písemky a školní akce z timeline. U akcí nabídne
aplikace jedním klikem vytvoření události v kalendáři.

> **Kdy to nebude fungovat:** účet chráněný dvoufázovým ověřením nebo
> přihlašování přes Google či Microsoft. A protože jde o neoficiální cestu,
> stahování se může rozbít, kdykoli EduPage něco změní — pak stačí povýšit
> `edupage-api` v `edupage/requirements.txt`.

### 5. Telegram notifikace (nepovinné)

1. V Telegramu napiš [@BotFather](https://t.me/BotFather) → `/newbot`
2. Token vlož do `.env` jako `TELEGRAM_BOT_TOKEN`
3. Vymysli si náhodný `TELEGRAM_WEBHOOK_SECRET`
4. Po nasazení zaregistruj webhook:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://planovac.tvoje-domena.cz/api/telegram/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
    "allowed_updates": ["message"]
  }'
```

Každý člen rodiny si pak v **Nastavení → Telegram** vygeneruje šestimístný kód
a pošle ho botovi. Hotovo.

### 6. Nasazení na Hetzner

Stačí nejmenší CX22 (2 vCPU / 4 GB). Ubuntu 24.04.

```bash
# na serveru jako root
bash deploy/hetzner-setup.sh        # Docker, firewall, swap, automatické aktualizace

git clone <adresa-repozitáře> /opt/rodinny-planovac
cd /opt/rodinny-planovac
cp .env.example .env && nano .env   # doplň klíče + APP_DOMAIN

docker compose up -d --build
```

Nasměruj `A` záznam domény na IP serveru — Caddy si certifikát od Let's Encrypt
vyřídí sám během několika vteřin.

Aktualizace na novější verzi:

```bash
bash deploy/update.sh
```

Kontejner `cron` volá každou hodinu `/api/cron/reminders`, který rozešle
připomínky a zesynchronizuje Google kalendáře. Ručně:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://planovac.tvoje-domena.cz/api/cron/reminders
```

---

## Struktura projektu

```
src/
├── app/
│   ├── (auth)/            přihlášení, registrace
│   ├── (app)/             přehled, kalendář, kroužky, výdaje, události, nastavení
│   ├── api/               Google OAuth + sync, Telegram webhook, cron
│   ├── pozvanka/[token]/  přijetí pozvánky do rodiny
│   └── vitejte/           průvodce prvním nastavením
├── components/
│   ├── ui/                tlačítka, karty, formuláře, bottom sheet
│   ├── calendar/          měsíční mřížka a detail dne
│   ├── activities/        kroužky a plán dopravy
│   ├── expenses/          výdaje, účtenky, grafy
│   ├── events/            školní a lékařské události
│   ├── family/            děti a členové
│   └── settings/          profil, střídání, Google, Telegram
└── lib/
    ├── custody.ts         výpočet, u koho děti kdy jsou
    ├── activities.ts      rozvinutí opakujících se kroužků
    ├── reminders.ts       plánování a rozesílání notifikací
    ├── google-sync.ts     přenos do Google kalendáře
    └── supabase/          klienti pro prohlížeč, server a servisní úlohy

supabase/migrations/       SQL schéma, RLS a Storage
deploy/                    skripty pro Hetzner
```

### Jak funguje výpočet střídavé péče

`src/lib/custody.ts` je jediné místo, kde se rozhoduje, u koho děti jsou.
Pravidla se vyhodnocují v tomto pořadí:

1. **Výjimka pro konkrétní dítě** na daný den
2. **Výjimka pro celou rodinu** na daný den
3. **Vzor přiřazený konkrétnímu dítěti** (nejnovější platný)
4. **Vzor pro celou rodinu** (nejnovější platný)

Noc ze dne *D* na *D+1* patří té straně, která má dítě v den *D* — podle toho se
počítají statistiky.

---

## Bezpečnost a soukromí

- Data jsou oddělená po rodinách přes RLS přímo v Postgresu.
- Účtenky leží v privátním bucketu, zobrazují se přes dočasné podepsané odkazy
  platné jednu hodinu.
- `service_role` klíč se používá jen na serveru — v cronu, při synchronizaci
  s Googlem a v Telegram webhooku.
- Google refresh tokeny jsou v databázi zašifrované.
- Caddy posílá bezpečnostní hlavičky včetně HSTS.

---

## Příkazy

```bash
npm run dev         # vývojový server
npm run build       # produkční build
npm run start       # spuštění produkčního buildu
npm run typecheck   # kontrola typů
```

### Test databázového zabezpečení

Migrace se dají ověřit proti čistému Postgresu — skript založí testovací
databázi, nahraje schéma a projde chování RLS z pohledu tří různých uživatelů
(vlastník rodiny, pozvaný rodič, cizí člověk):

```bash
PGHOST=/tmp PGPORT=5433 bash supabase/tests/run.sh
```

Kontroluje mimo jiné, že cizí uživatel nevidí ani jeden řádek, že rodič bez
role správce nepřejmenuje rodinu a že přiřazení řidiče i odeslané notifikace
se nemohou zduplikovat.
