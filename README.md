# Klidoo

Webová aplikace pro rodiny ve střídavé péči. Kalendář, kdo má kdy děti, kroužky
a plán dopravy, výdaje s fotkami účtenek, školní i lékařské události — a všechno
sdílené s druhým rodičem, prarodiči nebo kýmkoli dalším, koho pozvete.

Optimalizované pro mobil (PWA — dá se přidat na plochu), funguje i na desktopu.

---

## Co aplikace umí

| Oblast | Popis |
|---|---|
| **Kalendář péče** | Vzory střídání (po týdnu, 2‑2‑3, vlastní rozpis, trvale u jednoho rodiče), ruční výjimky na jednotlivé dny, barevné odlišení rodičů, počítání nocí za měsíc i za rok |
| **Rozvrh** | Rozvrh hodin pro každé dítě zvlášť, včetně škol se sudým a lichým týdnem. Z rozvrhu se bere konec vyučování — podle něj se plánuje předání i odvoz |
| **Kroužky** | Opakující se termíny, místo, cena, sezóna. Ke každému termínu se přiřazuje, **kdo veze tam a kdo zpět** — a řidiči přijde připomínka |
| **Události** | Škola v přírodě, třídní schůzky, focení, školní výlety, lékařské prohlídky, narozeniny. Vlastní připomínky u každé události |
| **Výdaje** | Výživné, kroužky, oblečení, škola, zdraví… Fotka účtenky přímo z foťáku, rozdělení nákladů mezi rodiče, přehled kdo komu dluží |
| **Přehled** | Kdo má dnes děti, kolik se letos utratilo za které dítě, poměr nocí matka/otec, nejbližší doprava a události |
| **Google kalendář** | Každý člen si propojí **svůj** účet; péče, kroužky i události se přenesou do jeho kalendáře |
| **EduPage** | Úkoly, písemky, zprávy od učitelů, školní akce a rozvrh ze školního systému. Víc dětí pod jedním účtem, všechno roztříděné podle toho, komu patří (jen rodinná verze) |
| **Telegram** | Připomínky zdarma přímo do telefonu — kdo zítra veze, kdy je předání, co se blíží |
| **Kalkulačka** | Veřejná stránka `/kalkulacka` bez přihlášení — spočítá rozpis dnů i noci u každého rodiče, jde sdílet odkazem a po přihlášení se rozpis překlopí rovnou do aplikace |
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
   - `0004`–`0010` — pozdější rozšíření (střídání po sudých týdnech, okresy,
     dvoutýdenní rozpis, EduPage, rozvrh, víc dětí, zprávy a veřejná kalkulačka)
3. V **Project Settings → API** si zkopíruj:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` klíč → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` klíč → `SUPABASE_SERVICE_ROLE_KEY` *(tenhle nikdy nikam nedávej veřejně)*
4. V **Authentication → URL Configuration** nastav:
   - Site URL: `https://klidoo.cz`
   - Redirect URLs: `https://klidoo.cz/auth/callback`

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
   - Authorized redirect URI: `https://klidoo.cz/api/google/callback`
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

Při vývoji na vlastním stroji se služba pouští mimo Docker. `--reload`
znamená, že si po každé úpravě načte kód sama — bez něj běží pořád ta
verze, se kterou se spustila, a ladí se pak něco, co vůbec neběží:

```bash
cd edupage
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
EDUPAGE_SIDECAR_SECRET=$(grep '^EDUPAGE_SIDECAR_SECRET=' ../.env.local | cut -d= -f2-) \
  python -m uvicorn main:app --port 8000 --reload
```

`curl http://127.0.0.1:8000/health` vrátí i seznam toho, co spuštěná
verze umí — podle něj se pozná, jestli běží to, co si myslíš.

Propojení pak proběhne v aplikaci v **Nastavení → EduPage**. Každý rodič
zadává vlastní přihlašovací údaje; heslo se ukládá zašifrované a nikdo ho
nemusí sdílet s druhým rodičem. Stažené věci ale vidí celá rodina.

**Děti.** Rodičovský účet vidí data dítěte až po přepnutí na něj, a dětí
tam bývá víc. V nastavení proto tlačítko **Najít** projde přihlašovací data
a nabídne, co v nich za děti našlo; ke každému se pak vybere, kterému dítěti
v plánovači odpovídá. Bez toho přiřazení se dítě nestahuje — nebylo by
poznat, komu úkol patří. Když se hledání nechytne (EduPage má strukturu
dat u každé školy trochu jinou), dá se ID přidat ručně: v EduPage se přepni
na dítě a v adrese stránky bude `studentid=…`.

Co se stáhne: úkoly, písemky, **zprávy od učitelů**, školní novinky a akce
z timeline. Všechno označené tím, kterého dítěte se týká, takže se to dá na
stránce **Ze školy** filtrovat. U akcí nabídne aplikace jedním klikem
vytvoření události v kalendáři.

Na stránce **Rozvrh** je tlačítko, které stáhne rozvrh hodin pro všechny
spárované děti. Čte se čtrnáct dní dopředu, aby se poznalo, jestli škola
jede na sudý a lichý týden. Denní rozvrh z EduPage nese i to, co ten den
odpadá — z toho se udělají **změny**, které se ukážou u rozvrhu, v detailu
dne a projeví se i na „dnes končí" na přehledu.

> Ručně zapsané hodiny stažení nepřepíše. Nahrazují se jen ty, které z
> EduPage přišly minule.

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
    "url": "https://klidoo.cz/api/telegram/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
    "allowed_updates": ["message"]
  }'
```

Každý člen rodiny si pak v **Nastavení → Telegram** vygeneruje šestimístný kód
a pošle ho botovi. Hotovo.

### 6. Nasazení na Hetzner

Stačí nejmenší CX22 (2 vCPU / 4 GB). Ubuntu 24.04.

> **Data leží v Supabase, ne na serveru.** Když server shoří, přijdeš
> o pár minut výpadku, ne o kalendář ani o účtenky. Zálohovat je potřeba
> Supabase, ne Hetzner.

```bash
# na serveru jako root
bash deploy/hetzner-setup.sh        # Docker, firewall, swap, automatické aktualizace

git clone <adresa-repozitáře> /opt/klidoo
cd /opt/klidoo
cp .env.example .env && nano .env   # doplň klíče + APP_DOMAIN

docker compose up -d --build
```

Nasměruj `A` záznam domény na IP serveru — Caddy si certifikát od Let's Encrypt
vyřídí sám během několika vteřin. Doména musí ukazovat na server **dřív**, než
spustíš compose: Let's Encrypt ověřuje vlastnictví přes veřejný dotaz a při
neúspěchu chvíli čeká, než to zkusí znovu.

#### Na co nezapomenout mimo server

Tři věci mají adresu aplikace zadrátovanou jinde. Bez nich se dá přihlásit,
ale rozbijí se přihlašovací odkazy, Google i notifikace:

| Kde | Co nastavit |
|---|---|
| Supabase → Authentication → URL Configuration | Site URL `https://klidoo.cz`, do Redirect URLs přidat `https://klidoo.cz/auth/callback` |
| Google Cloud → Credentials → OAuth client | přidat `https://klidoo.cz/api/google/callback` |
| Telegram | zaregistrovat webhook na ostrou adresu (viz výše) |

A v `.env` musí `NEXT_PUBLIC_SITE_URL` být ostrá adresa — zapéká se do
klientského balíčku při buildu, takže pozdější změna znamená přestavět obraz.

Aktualizace na novější verzi:

```bash
bash deploy/update.sh
```

Kontejner `cron` volá každou hodinu `/api/cron/reminders`, který rozešle
připomínky a zesynchronizuje Google kalendáře. Ručně:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://klidoo.cz/api/cron/reminders
```

---

## Struktura projektu

```
src/
├── app/
│   ├── (auth)/            přihlášení, registrace
│   ├── (app)/             přehled, kalendář, kroužky, výdaje, události, nastavení
│   ├── api/               Google OAuth + sync, Telegram webhook, cron
│   ├── kalkulacka/        veřejná kalkulačka a sdílené rozpisy
│   ├── pozvanka/[token]/  přijetí pozvánky do rodiny
│   └── vitejte/           průvodce prvním nastavením
├── components/
│   ├── ui/                tlačítka, karty, formuláře, bottom sheet
│   ├── calendar/          měsíční mřížka a detail dne
│   ├── activities/        kroužky a plán dopravy
│   ├── expenses/          výdaje, účtenky, grafy
│   ├── events/            školní a lékařské události
│   ├── rozvrh/            rozvrh hodin
│   ├── family/            děti a členové
│   └── settings/          profil, střídání, Google, Telegram
└── lib/
    ├── custody.ts         výpočet, u koho děti kdy jsou
    ├── rozvrh.ts          rozvrh hodin a skládání staženého z EduPage
    ├── kalkulacka.ts      výpočty pro veřejnou kalkulačku
    ├── brand.ts           název produktu na jednom místě
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

### Veřejná kalkulačka

`/kalkulacka` je jediná stránka mimo přihlášení, která něco počítá — a je to
záměrně vstupní brána z vyhledávače. Počítá se **v prohlížeči** stejným kódem
(`custody.ts`) jako kalendář v aplikaci, takže po registraci nevyjde nic jiného,
než co stránka slíbila. Na server se pošle až uložení, které vrátí odkaz ke
sdílení; e-mail je nepovinný a když ho někdo nechá, dostane přihlašovací odkaz
a rozpis se mu po přihlášení překlopí do průvodce.

Jména dětí kalkulačka nesbírá — k výpočtu nejsou potřeba a veřejný nástroj bez
přihlášení není místo, kde by měly ležet. Tabulka `kalkulacka_plany` nemá žádné
RLS politiky schválně: sahá na ni jen serverová část servisním klíčem a rozpis
otevírá jedině náhodný token z odkazu.

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
npm run test        # výpočty rozvrhu i kalkulačky
```

Hledání dětí v datech EduPage má vlastní testy — struktura se mezi školami
liší, takže se hledá podle tvaru a bez testů by se chyba poznala až tím, že
rodič nevidí druhé dítě:

```bash
cd edupage && python test_deti.py
```

### Test databázového zabezpečení

Migrace se dají ověřit proti čistému Postgresu — skript založí testovací
databázi, nahraje schéma a projde chování RLS z pohledu tří různých uživatelů
(vlastník rodiny, pozvaný rodič, cizí člověk):

```bash
PGHOST=/tmp PGPORT=5433 bash supabase/tests/run.sh
```

Kontroluje mimo jiné, že cizí uživatel nevidí ani jeden řádek, že rodič bez
role správce nepřejmenuje rodinu, že přiřazení řidiče i odeslané notifikace
se nemohou zduplikovat, že se do rozvrhu nedá zapsat hodina s koncem před
začátkem a že položky ze školy smí zakládat jen stahování, ne člen rodiny.
