# Podklady pro App Store a Google Play

Texty jsou ve vykání a ve slovníku značky.

**Důležité:** popis v obchodech **nesmí zmiňovat ceny, předplatné ani
placení na webu**. Apple i Google to berou jako výzvu k nákupu mimo
jejich platby.

## Obrázky (složka `mobil/obchody/`)

| Soubor | Kam |
|---|---|
| `snimky/ios/01–06-*.png` (1320 × 2868) | App Store → iPhone 6,9" |
| `snimky/android/01–06-*.png` (1080 × 2340) | Google Play → Snímky obrazovky telefonu |
| `ikona-512.png` | Google Play → Ikona aplikace |
| `uvodni-grafika-1024x500.png` | Google Play → Úvodní grafika |
| ikona pro App Store | bere se z aplikace (`Assets.xcassets`) |

Obnovit po změně aplikace: `node mobil/scripts/snimky-obchody.mjs http://localhost:3110`
(při běžícím `npx next dev -p 3110`).

## Název a krátké texty

| Pole | Text | Limit |
|---|---|---|
| Název (oba obchody) | Klidoo – střídavá péče | 30 |
| Podtitul (App Store) | Společný kalendář pro rodiče | 30 |
| Krátký popis (Google Play) | Kalendář střídavé péče, předávky, kroužky a výdaje na děti na jednom místě. | 80 |
| Propagační text (App Store) | Dvě domácnosti. Jedno dětství. Kdo má děti kdy, kdo veze na kroužek a kdo co zaplatil, přehledně pro oba rodiče. | 170 |
| Klíčová slova (App Store) | `střídavá péče,rozvod,rozchod,koparenting,předávka,výživné,kroužky,výdaje,kalendář,děti,rodiče` | 100 |
| Kategorie | App Store: Lifestyle (+ Productivity), Google Play: Rodičovství | |
| Web podpory | https://klidoo.cz/bezpecnost | |
| Marketingový web | https://klidoo.cz | |
| Zásady soukromí | https://klidoo.cz/zasady-ochrany-osobnich-udaju | |
| Smazání účtu (Google) | https://klidoo.cz/smazani-uctu | |
| Kontakt | info@klidoo.cz | |

## Dlouhý popis (oba obchody)

```
Klidoo je společný kalendář pro rodiny, které žijí ve dvou domácnostech. Oba rodiče vidí totéž: u koho jsou děti, kdo je kdy předává, kdo veze na kroužek a kdo co zaplatil. Méně domlouvání, méně nedorozumění, víc klidu pro děti.

FUNGUJE I BEZ DRUHÉHO RODIČE
Začít můžete sami. Druhého rodiče pozvete, až budete chtít — nebo nikdy.

KALENDÁŘ STŘÍDAVÉ PÉČE
• Týden/týden, 2-2-3, sudé a liché týdny i vlastní rozpis
• Prázdniny, svátky a výjimky
• Žádost o prohození dnů, kterou druhý rodič schválí nebo odmítne

PŘEDÁVKY A KROUŽKY
• Kdo předává, kdy a kde
• Kdo veze na kroužek a kdo vyzvedává
• Připomínka večer předem přímo do telefonu

ŠKOLA
• Školní akce a rozvrhy na jednom místě

VÝDAJE NA DĚTI
• Výdaje s účtenkou, rozdělené podle vaší dohody
• Žádost o proplacení a přehled, kdo komu kolik dluží
• Opakované výdaje (kroužky, obědy) se zapíšou samy

ZPRÁVY A HISTORIE
• Zprávy mezi rodiči oddělené od soukromé komunikace
• Historie změn, kterou vidí oba
• Ověřitelný výpis pro advokáta, mediátora nebo soud

DOKLADY DĚTÍ
• Kartička pojišťovny, očkování a další doklady vždy po ruce

SOUKROMÍ
Vaše rodinné údaje nejsou veřejné. Vidí je jen členové rodiny, které sami pozvete. Data jsou uložená na serverech v EU. Aplikace neobsahuje reklamy a vaše údaje nikomu neprodáváme.

Prarodiče, chůvu nebo nového partnera můžete přizvat jen ke čtení.
```

*(Větu „Data jsou uložená na serverech v EU“ ponechte jen tehdy, pokud
jste v Supabase ověřil region, viz dřívější úkol.)*

## Poznámky pro kontrolu (App Review / Google)

```
Klidoo is a free companion app to the Klidoo web service (klidoo.cz) for separated parents sharing custody: a shared calendar, handovers, kids' activities, expenses and messages.

The app does not offer any purchases and contains no links or calls to action for purchasing (App Review Guideline 3.1.3(f)). Families who subscribe on the web can use their account in the app.

Native features: push notifications for handovers and reminders (APNs), opening family invitations from e-mail directly in the app (Universal Links), system-browser sign-in with Google and Apple, offline screen.

Account deletion: Settings (Nastavení) → scroll to the bottom → "Smazat účet".

Demo account (contains a sample family with calendar, expenses and messages):
E-mail: <doplnit>
Password: <doplnit>
```

Testovací účet si musíte založit sami:
- Zaregistrujte se na webu s adresou, kterou nepoužíváte (např.
  `review@klidoo.cz`).
- Projděte průvodce a vyplňte pár událostí, výdajů a zpráv.
- Heslo napište jen do formuláře v App Store Connect / Play Console,
  nikam jinam.

## App Store: App Privacy (dotazník)

**Sledování (Tracking): Ne.**

| Typ údajů | Sbírá se | Propojeno s uživatelem | Účel |
|---|---|---|---|
| Kontaktní údaje → Jméno | ano | ano | Funkčnost aplikace |
| Kontaktní údaje → E-mail | ano | ano | Funkčnost aplikace; Marketing vývojáře (jen se souhlasem) |
| Finanční údaje → Jiné finanční údaje (výdaje, číslo účtu pro proplacení) | ano | ano | Funkčnost aplikace |
| Nákupy → Historie nákupů (stav předplatného rodiny) | ano | ano | Funkčnost aplikace |
| Uživatelský obsah → Fotky (účtenky, doklady) | ano | ano | Funkčnost aplikace |
| Uživatelský obsah → Jiný obsah (kalendář, děti, zprávy, kontakty) | ano | ano | Funkčnost aplikace |
| Identifikátory → ID uživatele | ano | ano | Funkčnost aplikace |
| Využití → Interakce s produktem (anonymní vlastní měření) | ano | **ne** | Analýza |

Nesbírá se: poloha, zdravotní údaje, kontakty z telefonu, historie
prohlížení, diagnostika třetích stran, reklamní identifikátor.

## Google Play: Bezpečnost údajů

**Obecně:**
- Šifrování při přenosu: **ano**.
- Žádost o smazání údajů: **ano**, `https://klidoo.cz/smazani-uctu`.
- Údaje se **nesdílejí** se třetími stranami. Zpracovatelé (Supabase,
  e-mail, Mailchimp jen se souhlasem) se podle Googlu za sdílení
  nepovažují.

**Shromažďované údaje** (vše povinné pro funkci, kromě marketingového
e-mailu):

| Kategorie | Údaj | Účel |
|---|---|---|
| Osobní údaje | Jméno, e-mailová adresa | Funkce aplikace, Správa účtu, (Marketing, jen se souhlasem) |
| Finanční údaje | Jiné finanční údaje (výdaje, číslo účtu) | Funkce aplikace |
| Fotky a videa | Fotky (účtenky, doklady) | Funkce aplikace |
| Zprávy | Ostatní zprávy v aplikaci | Funkce aplikace |
| Aktivita v aplikaci | Interakce s aplikací (anonymní) | Analýza |
| ID zařízení | Token pro notifikace | Funkce aplikace |

## Hodnocení obsahu

**Google Play (IARC):**
- kategorie „Komunikace / sociální“ ne, „Užitečné nástroje“ ano;
- násilí, sex, hazard a drogy ne;
- uživatelé spolu komunikují: ano (jen členové rodiny, které si
  pozvou);
- sdílí polohu: ne.

**App Store:** všechny otázky „None/No“. Vyjde 4+.

**Cílová skupina (Google):** 18 a více let. Aplikace je pro rodiče, ne
pro děti.

## Reklamy
Aplikace **neobsahuje reklamy** (Google Play → Reklamy: Ne).
