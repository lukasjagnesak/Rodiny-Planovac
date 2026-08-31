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
| **Kroužky** | Opakující se termíny, místo, cena, sezóna. Ke každému termínu se přiřazuje, **kdo veze tam a kdo zpět** — a řidiči přijde připomínka. Cena se dělí mezi rodiče a zaplacené období se zapíše do výdajů |
| **Události** | Škola v přírodě, třídní schůzky, focení, školní výlety, lékařské prohlídky, narozeniny. Vlastní připomínky u každé události |
| **Výdaje** | Výživné, kroužky, oblečení, škola, zdraví… Fotka účtenky přímo z foťáku, rozdělení nákladů mezi rodiče, přehled kdo komu dluží |
| **Přehled** | Kdo má dnes děti, kolik se letos utratilo za které dítě, poměr nocí matka/otec, nejbližší doprava a události |
| **Google kalendář** | Každý člen si propojí **svůj** účet; péče, kroužky i události se přenesou do jeho kalendáře |
| **EduPage** | Úkoly, písemky, zprávy od učitelů, školní akce a rozvrh ze školního systému. Víc dětí pod jedním účtem, všechno roztříděné podle toho, komu patří (jen rodinná verze) |
| **Telegram** | Připomínky zdarma přímo do telefonu — kdo zítra veze, kdy je předání, co se blíží |
| **Kalkulačka** | Veřejná stránka `/kalkulacka` bez přihlášení — spočítá rozpis dnů i noci u každého rodiče, jde sdílet odkazem a po přihlášení se rozpis překlopí rovnou do aplikace |
| **Veřejný web** | Úvodní stránka, průvodce střídavou péčí, vzor dohody, kalkulačka výživného a stránky pro advokáty a mediátory — ve stejném designu jako aplikace, protože berou barvy i písmo ze stejných proměnných |
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
   - `0004`–`0021` — pozdější rozšíření (střídání po sudých týdnech, okresy,
     dvoutýdenní rozpis, EduPage, rozvrh, víc dětí, zprávy, veřejná kalkulačka,
     kontakty, oznámení, doklady, sběr kontaktů z webu, dělení ceny kroužků
     a noc na dni předání, předplatné, paywall, opakované výdaje a měření provozu)
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

### 5b. E-maily (SMTP)

Aplikace posílá pozvánky druhému rodiči, upozornění na konec zkušebního období
a na neúspěšnou platbu. Adresa, ze které to chodí, je `info@klidoo.cz`.

Jsou to **dvě různé věci** a je potřeba obojí:

| | K čemu | Kdo to umí |
|---|---|---|
| **Schránka** | aby na `info@klidoo.cz` mohl někdo napsat a ty si to přečetl | poštovní hosting (WEDOS, Zoho, Google Workspace) |
| **Odesílací relé** | aby aplikace mohla poslat tisíc pozvánek a nespadly do spamu | Resend, Brevo, Mailgun, SES |

Schránka na hostingu zvládne i odesílání, ale s limity a horší doručitelností;
relé zase neumí příchozí poštu. Proto obojí.

> Vestavěná pošta Supabase na tohle nestačí — má limit pár zpráv za hodinu
> a odesílá z cizí domény, takže pozvánky končí ve spamu.

**Kde je doména.** `klidoo.cz` má DNS u **WEDOS** (`ns.wedos.cz`), takže
všechny záznamy níž se zadávají ve WEDOS → *Domény → klidoo.cz → DNS
záznamy*. Změna se projeví do pár minut, ale počítej i s hodinou.

Stav ke dni psaní: doména má jen `A` záznam na server. **MX, SPF, DKIM ani
DMARC zatím neexistují** — dokud nebudou, na `info@klidoo.cz` nic nedojde
a odchozí zprávy budou končit ve spamu.

#### 1. Schránka info@klidoo.cz

Vyber poskytovatele a podle jeho návodu přidej **MX záznamy na kořenovou
doménu** `klidoo.cz`:

| Kde | Cena | Háček |
|-----|------|-------|
| **WEDOS mail** | řádově desítky Kč měsíčně | DNS i doména už tam jsou, MX se vyplní samo |
| **Google Workspace** | kolem 150 Kč / uživatel / měsíc | nejlepší doručitelnost, IMAP, Google účet už máš kvůli kalendáři |
| **Zoho Mail zdarma** | 0 Kč | **od roku 2025 bez IMAP/POP** — jen přes web, v Mailu na Macu to neotevřeš |

Postup ve WEDOSu (tam má klidoo.cz DNS): *Zákaznické centrum → DNS → vybrat
doménu → Editace DNS záznamů → Přidat záznam*. Typ `MX`, název nech prázdný
(platí pro celou doménu), do hodnoty patří jméno serveru **s tečkou na konci**
a zvlášť priorita (nižší číslo = přednější server).

> **Změny se ve WEDOSu neprojeví, dokud nekliknete na „Aplikovat změny".**
> Tohle je nejčastější důvod, proč „nastavený" MX záznam nefunguje.

Záznam `A` na server nechej být — `MX` a `A` vedle sebe fungují, jeden je pro
web a druhý pro poštu.

Ověření z terminálu, do deseti minut po změně:

```bash
dig +short MX klidoo.cz          # musí vypsat servery poskytovatele
```

Pak si na `info@klidoo.cz` pošli zkušební zprávu z jiné adresy.

#### 2. Odesílací relé

> **Na začátku se dá přeskočit.** Když si u WEDOSu zřídíš mailhosting,
> můžeš jeho SMTP použít i pro aplikaci — schránka i odesílání pak jsou
> na jednom místě a odpadá ověřování druhé domény. Aplikace je na
> poskytovateli nezávislá, takže přechod na relé je později otázka čtyř
> proměnných v `.env`. Dělej to, jakmile budeš posílat víc než pár desítek
> zpráv denně nebo budeš potřebovat vidět, co se nedoručilo — sdílený
> mailhosting na to nemá ani limity, ani přehledy.

V [Resendu](https://resend.com) (3 000 zpráv měsíčně zdarma, evropský region)
přidej doménu `klidoo.cz`. Resend ti vypíše záznamy — obvykle na
**poddoméně `send.klidoo.cz`**, takže se netlučou s poštovní schránkou na
kořenové doméně. Zkopíruj je do WEDOS **přesně tak, jak je vypsané** (DKIM
klíč je citlivý na velikost písmen) a nech doménu ověřit.

#### 3. DMARC

Jeden TXT záznam navíc, který říká, co se má stát s poštou, která se za tvoji
doménu jen vydává:

| Typ | Název | Hodnota |
|-----|-------|---------|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:info@klidoo.cz` |

Nech `p=none`, dokud ti pár týdnů nechodí reporty a nevidíš, že všechno
prochází. Teprve pak zpřísni na `p=quarantine`.

> **Jedna doména = jeden SPF záznam.** Když ti poštovní hosting i relé dají
> každý svůj SPF pro kořenovou doménu, **nesmíš vytvořit dva TXT záznamy** —
> to celý SPF zneplatní. Slouč je do jednoho:
> `v=spf1 include:jedno.cz include:druhe.cz ~all`

#### 4. Nastav aplikaci

```bash
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=<API klíč z Resendu>
SMTP_FROM_NAME=Klidoo
SMTP_FROM_EMAIL=info@klidoo.cz
SMTP_REPLY_TO=info@klidoo.cz
```

Odesílatel je schválně rozdělený na dvě proměnné: `SMTP_FROM=Klidoo
<info@klidoo.cz>` by rozbilo `source .env` v nasazovacím skriptu, protože
`<` je v shellu přesměrování.

#### 5. Ověř

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://klidoo.cz/api/mail/kontrola?komu=tvuj@email.cz"
```

Vrátí stav spojení a pošle zkušební zprávu. Bez `?komu=` jen otestuje
přihlášení k serveru. Zkušební zprávu si nech přijít na Gmail i na Seznam
a v obou podmínkách zkontroluj, že nespadla do spamu.

#### 6. Přepni i přihlašovací e-maily

V Supabase **Authentication → Emails → SMTP Settings** vyplň ty samé údaje.
Do té doby chodí potvrzení registrace a magic linky ze Supabase — z jejich
domény a s jejich limitem.

### 6. Nasazení na Hetzner

Postup pro **aktualizaci už běžící instance** je v [`deploy/POSTUP.md`](deploy/POSTUP.md)
— včetně pořadí migrací, kontroly po nasazení a návratu na předchozí verzi.

Stačí nejmenší CX22 (2 vCPU / 4 GB). Ubuntu 24.04.

> **Data leží v Supabase, ne na serveru.** Když server shoří, přijdeš
> o pár minut výpadku, ne o kalendář ani o účtenky. Zálohovat je potřeba
> Supabase, ne Hetzner.

```bash
# na serveru jako root
git clone <adresa-repozitáře> /opt/klidoo
cd /opt/klidoo

bash deploy/hetzner-setup.sh        # Docker, firewall, swap, automatické aktualizace
cp .env.example .env && nano .env   # doplň klíče + APP_DOMAIN
bash deploy/prvni-start.sh          # kontrola nastavení, build, ověření
```

`prvni-start.sh` projde `.env` dřív, než se pustí několikaminutový build:
hlídá prázdné i nepřepsané ukázkové hodnoty, kontroluje, že si adresa
a doména odpovídají, a upozorní, když doména ještě nemíří na tenhle
server. Zapomenutý klíč se jinak projeví až tím, že aplikace naběhne
a nikdo se nepřihlásí.

#### DNS

Doména musí ukazovat na server **dřív**, než spustíš compose: Let's Encrypt
ověřuje vlastnictví přes veřejný dotaz a při neúspěchu chvíli čeká, než to
zkusí znovu.

U registrátora má zůstat přesně tohle:

| Záznam | Hodnota |
|---|---|
| `A` na `@` | IP serveru |
| `A` na `www` | tatáž IP |
| `AAAA` | jen pokud má server IPv6 — jinak žádný |

**Staré záznamy je potřeba smazat, ne jen přidat nový.** Parkovací stránka
registrátora obvykle nechá `A` i `AAAA` na svoji adresu; když vedle nich
přibude záznam na server, návštěvníci se střídavě trefují jinam a Let's
Encrypt certifikát nevydá, protože výzvu dostane cizí server. U `AAAA` je to
horší: kdo má IPv6 — tedy skoro každý mobil — jde po něm přednostně a na
server se nedostane vůbec.

`prvni-start.sh` tohle kontroluje a vypíše, který záznam přebývá.

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

Kontejner `cron` volá každou hodinu `/api/cron/reminders`. Ten rozešle
připomínky, zesynchronizuje Google kalendáře a **jednou za tři hodiny
stáhne novinky z EduPage**. Každá část si hlídá vlastní interval, protože
cron je jen jeden — u EduPage se pozná z `last_sync_at` u účtu, takže to
přežije restart i to, že cron chodí jinak často.

Ručně:

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
│   ├── (web)/             veřejný web: úvodní stránka, obsahové stránky, kalkulačky
│   ├── api/               Google OAuth + sync, Telegram webhook, cron, sběr kontaktů
│   ├── pozvanka/[token]/  přijetí pozvánky do rodiny
│   └── vitejte/           průvodce prvním nastavením
├── components/
│   ├── ui/                tlačítka, karty, formuláře, bottom sheet
│   ├── calendar/          měsíční mřížka a detail dne
│   ├── activities/        kroužky a plán dopravy
│   ├── expenses/          výdaje, účtenky, grafy
│   ├── events/            školní a lékařské události
│   ├── rozvrh/            rozvrh hodin
│   ├── web/               stavební prvky veřejného webu a sběr kontaktů
│   ├── family/            děti a členové
│   └── settings/          profil, střídání, Google, Telegram
└── lib/
    ├── custody.ts         výpočet, u koho děti kdy jsou
    ├── rozvrh.ts          rozvrh hodin a skládání staženého z EduPage
    ├── kalkulacka.ts      výpočty pro veřejnou kalkulačku
    ├── vyzivne.ts         orientační výživné podle tabulky MSp
    ├── atribuce.ts        odkud návštěvník webu přišel
    ├── brand.ts           název produktu na jednom místě
    ├── partneri.ts        podmínky programu pro mediátory
    ├── provozovatel.ts    identifikace správce údajů (DOPLNIT)
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

### Dny a noci

Kalendář zaškrtává **dny**, ale u střídavé péče se počítají **noci** — a to je
číslo, ze kterého se odvíjí i výživné. Uvnitř pobytu je to totéž, na dni předání
ne: noc patří tomu, u koho dítě usíná.

Kdy se předává, z rozpisu dnů nevyplývá. Tytéž dva zaškrtnuté dny můžou být jedna
noc i dvě podle toho, jestli dítě přijede odpoledne a druhý den odpoledne odjede,
nebo jestli přespí a odjíždí až ráno. Proto to jsou dvě nastavení:

| Kde | Co určuje |
| --- | --- |
| `custody_patterns.predavka_vecer` | výchozí pravidlo pro celý vzor — `true` znamená, že na dni předání dítě spí už u přebírajícího |
| `custody_overrides.nocni_strana` | výjimka na konkrétní den; přebije vzor |

Den, kdy se noc liší ode dne, kreslí kalendář diagonálně přepůlený: vlevo nahoře
ten, kdo má dítě přes den, vpravo dole ten, u koho spí. Kliknutím na den se to
přepne.

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

### Veřejný web

Marketingové a obsahové stránky nejsou samostatný projekt — leží ve skupině
`src/app/(web)/` a používají **stejné CSS proměnné a písmo jako aplikace**. Když
se změní paleta, změní se s ní i web; nemůže se rozejít, protože není z čeho.

| Cesta | K čemu je |
| --- | --- |
| `/` | Úvodní stránka. Přihlášeného pošle rovnou na `/prehled` |
| `/jak-funguje-stridava-pece` | Průvodce — podmínky, rytmy, výživné, trvalé bydliště |
| `/vzor-dohody-o-stridave-peci` | Co dohoda musí obsahovat; `/text` je celý vzor k okopírování |
| `/kalkulacka-vyzivneho` | Orientační výživné podle tabulky MSp |
| `/kalkulacka` | Rozpis dnů a noci u každého rodiče |
| `/checklist-prvnich-30-dni` | Materiál k vytištění |
| `/pro-advokaty`, `/pro-mediatory` | Partnerské stránky |
| `/zasady-ochrany-osobnich-udaju` | Zásady zpracování údajů |

**Materiály se neposílají e-mailem.** Není odesílatel, a slíbit něco, co
nedorazí, je horší než nesbírat nic. E-mail se uloží do tabulky `leady`
a materiál se otevře rovnou na webu. Až bude vyřešené SMTP, stačí navázat
odesílání na `magnet` — texty tvrdí jen to, že se ozveme.

Odkud návštěvník přišel, se zapamatuje **při prvním zobrazení** (`lib/atribuce.ts`,
mountuje se v layoutu, ne ve formuláři). Lidé přistanou na článku a e-mail
nechají o dvě stránky dál, kde už v adrese žádné `utm` ani partnerský kód nejsou.
Odsud se počítají i provize v programu pro mediátory.

Před spuštěním doplň `src/lib/provozovatel.ts` — bez identifikace správce údajů
nejsou zásady podle GDPR úplné. Podmínky provizí jsou v `src/lib/partneri.ts`.

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
npm run test        # výpočty rozvrhu, kalkulaček a importu výdajů
npm run test:pismo  # mají písma české znaky? (potřebuje síť)
```

Hledání dětí v datech EduPage má vlastní testy — struktura se mezi školami
liší, takže se hledá podle tvaru a bez testů by se chyba poznala až tím, že
rodič nevidí druhé dítě:

```bash
cd edupage && python test_deti.py && python test_rozvrh.py
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
