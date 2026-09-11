# Google Ads pro Klidoo

Živý dokument. Každá změna v kampaních sem patří i s důvodem — za tři
měsíce už nikdo neví, proč je zrovna tohle klíčové slovo vyloučené.

Spravuje to agent `google-ads` (`.claude/agents/google-ads.md`).

---

## Spuštění krok za krokem

Pořadí není libovolné. **Kampaň se nezapíná dřív, než měří konverze** —
jinak se první týdny utratí naslepo a nedá se z nich nic naučit.

### 1. Účet a fakturace

Google Ads → nový účet → **přepnout do expertního režimu** hned na
začátku. Zjednodušený režim („Smart“) neumožní ruční CPC ani vypnout
obsahovou síť, což jsou obě věci, které tady potřebujeme.

Měna **CZK**, časové pásmo **Praha**. Obojí jde nastavit jen jednou a
měna se pak nedá změnit.

### 2. Konverze

Nástroje → **Konverze** → Nová konverze → Web.

Založ tři, všechny **s ručním označením (gtag)**, ne přes GA4 import:

| Konverze | Kategorie | Počítat | Hodnota |
|---|---|---|---|
| Registrace | Sign-up | jednu | bez hodnoty |
| Založená rodina | Sign-up | jednu | bez hodnoty |
| Předplatné | Purchase | jednu | z kódu (posílá se) |

**Jako primární nech jen Předplatné.** Zbylé dvě přepni na sekundární:
jsou to ukazatele, ne cíl. Kdyby se optimalizovalo na registrace, Google
najde lidi, kteří se rádi registrují a neplatí.

U každé konverze si opiš **štítek** (`AbC-dEf1…`) a z hlavičky účtu
**ID** (`AW-123456789`) — patří do `.env`, viz README.

### 3. Kampaň

Nová kampaň → **bez cíle** → typ **Vyhledávací síť**.

Nastavení, která se dají snadno přehlédnout a stojí peníze:

- **Obsahovou síť vypnout.** Zapíná se sama a rozpočet zmizí v bannerech
  na cizích webech.
- **„Partneři ve vyhledávací síti" vypnout** — dokud nevíme, jak se
  chová samotné vyhledávání.
- Lokalita **Česko**, a v upřesnění vybrat **„Přítomnost: lidé v této
  lokalitě"**. Výchozí nastavení počítá i lidi, kteří o Česku jen hledají.
- Jazyk čeština.
- Strategie **ruční CPC**, strop kolem 12 Kč. Automatické strategie
  potřebují desítky konverzí měsíčně, které zatím nejsou.
- Rozpočet **165 Kč/den**.

### 4. Sestavy a inzeráty

Sestavy podle kapitoly níž. U každé **frázová a přesná shoda**, volná až
později. Do každé sestavy aspoň tři nadpisy a dva popisy z hotových
textů níž.

### 5. Než se to zapne

- [ ] `NEXT_PUBLIC_ADS_ID` a štítky v `.env`, obraz **přestavěný**
- [ ] Na klidoo.cz přijmout cookies a v Google Ads → Konverze ověřit,
      že značka hlásí **„Aktivní"** (může trvat pár hodin)
- [ ] Zkušební registrace → konverze se objeví v přehledu
- [ ] Negativní klíčová slova nahraná na úrovni účtu

### 6. První týden

Denně sestava **vyhledávacích dotazů** a vylučování. Nic jiného se
první týden nedělá — na vyhodnocení výkonu je brzy a zásahy do kampaně,
která se teprve rozjíždí, jen zamotají data.

---

## Strategie na jednu větu

Sklízet poptávku, která už existuje, ne ji vytvářet. Rozchod má
vyhledávací moment a Klidoo u něj má být.

---

## Co ukázal průzkum konkurence (září 2026)

**„Kalkulačka výživného" a „alimenty" jsou past.** Výsledky obsazují
Peníze.cz, Banky.cz, Kurzy.cz, Dostupný advokát, SOS výživné,
Rozvod-poradna. Jsou to domény s obrovskou autoritou a rozpočtem a
záměr za dotazem je „kolik budu platit", ne „potřebuju nástroj na
koordinaci". Draho a mimo.

**„Vzor dohody o střídavé péči" je obsazený, ale slabší.**
Pravnilinka.cz, Stridavka.cz, Vasevyzivne.cz. Záměr je blíž — ten
člověk právě teď něco řeší — ale pořád hledá papír, ne aplikaci.

**Dotazy na aplikaci jsou skoro volné.** V ČR existuje přímá
konkurence — **App2Us** (rodičovský plánovač s předplatným) a aplikace
od skupiny mediátorek — ale v placeném vyhledávání není na těchhle
dotazech tlačenice. Tady se dá koupit přesný záměr levně.

> Z toho plyne pořadí: **nejdřív dotazy na nástroj, potom obsah.**
> Přesně obráceně, než kam by člověka táhlo, že má hotové kalkulačky.

---

## Sestavy

### 1. Nástroj (jádro rozpočtu, ~50 %)

Vstupní stránka: `/`

Frázová a přesná shoda:

```
aplikace střídavá péče
aplikace pro střídavou péči
kalendář střídavé péče
plánovač střídavé péče
sdílený kalendář pro rodiče
aplikace pro rozvedené rodiče
aplikace pro odloučené rodiče
koordinace střídavé péče
střídavá péče organizace
```

### 2. Rozvrh a noci (~20 %)

Vstupní stránka: `/kalkulacka`

```
střídavá péče rozvrh
sudý lichý týden děti
kolik nocí u rodiče
rozpis střídavé péče
střídavá péče 2 2 3
harmonogram střídavé péče
```

### 3. Vzor dohody (~20 %)

Vstupní stránka: `/vzor-dohody-o-stridave-peci`

```
vzor dohody o střídavé péči
dohoda rodičů o péči vzor
návrh na střídavou péči vzor
dohoda o střídavé péči ke stažení
```

### 4. Značka (~10 %, levné, povinné)

Vstupní stránka: `/`

```
klidoo
klidoo cz
klidoo aplikace
```

> Značku kupuj, i když jsi v organických výsledcích první. Je to
> nejlevnější proklik v účtu a brání konkurenci postavit se nad tebe.

### Zatím nezakládat

**Kalkulačka výživného.** Až budou tři sestavy výš vyladěné a bude
rozpočet navíc. Zvlášť, s vlastním stropem, aby nesežrala zbytek.

**Konkurence** (`app2us` a podobné). Dotazů je málo, prokliky drahé
a přebíjet cizí značku u produktu postaveného na důvěře je risk pro
pověst. Případně až později a opatrně.

---

## Negativní klíčová slova

Na úrovni účtu, aby platila všude:

```
zdarma, free, zadarmo
práce, brigáda, kurz, školení, seminář
diplomová, bakalářská, seminární, referát
judikát, judikatura, zákon, paragraf, soudní rozhodnutí
advokát, advokátní, právník, právní pomoc
psycholog, terapie, poradna
kniha, knihy, pdf zdarma
wikipedia, diskuze, fórum
dávky, přídavky, porodné, rodičovský příspěvek
```

> Tohle je **výchozí seznam, ne konečný.** Jednou týdně projdi sestavu
> vyhledávacích dotazů a přidávej. Bez toho rozpočet vyteče do dotazů,
> které nikdy nic nekoupí.

---

## Texty inzerátů

Pravidla: mluv o situaci, ne o čtenáři. „Rozvádíte se?" je za hranou
u Googlu (osobní vlastnosti) i lidsky.

**Nadpisy:**

```
Kalendář pro dva domovy
Konec dohadování, kdo a kdy
Jeden rozvrh, vidí ho oba rodiče
Kroužky, odvozy i výdaje na jednom místě
30 dní zdarma, bez karty
Celá rodina za jednu cenu
Počítá noci, ne dny
```

**Popisy:**

```
U koho jsou tenhle týden, kdo veze z fotbalu, kdo platil obědy.
Napsané jednou, na jednom místě — a vidí to oba.

Jarní prázdniny podle okresu, výživné podle tabulky ministerstva.
Česká aplikace pro rodiny se dvěma domovy. 30 dní zdarma.
```

**Rozšíření odkazů:** Ceník · Jak funguje střídavá péče · Vzor dohody ·
Kalkulačka nocí

---

## Rozpočet

Start **5 000 Kč/měsíc**, tedy ~165 Kč denně. Rozdělení podle sestav
výš. Necílit na výkon první měsíc — cílem je zjistit, **který záměr
vede k platící rodině**, ne posbírat konverze.

Nastav:
- jazyk čeština, lokalita Česko
- **jen vyhledávací síť**, obsahovou vypnout (jinak se rozpočet ztratí
  v bannerech na cizích webech)
- strategie na začátku **ruční CPC se stropem**, ne maximalizace
  konverzí — ta potřebuje data, která ještě nejsou

---

## Na co se dívat

Tři čísla, v tomhle pořadí:

1. **Platící rodiny na kanál** — jediné, co platí nájem.
2. **Registrace, které dokončily průvodce** — registrace, která skončí
   na prvním kroku, je náklad bez výnosu.
3. Cena za proklik a míra prokliku — až potom, jako diagnostika.

Google Ads bude konverze podhodnocovat, protože se měří až po souhlasu
s cookies. **Pravda je v `/provoz`.**

Při desítkách konverzí měsíčně nemá smysl A/B testovat — rozdíly jsou
šum. Vypínej to, co je zjevně mimo, ne to, co má o procento horší číslo.

---

## Jak ověřit, že se konverze opravdu odesílá

Nejjednodušší cesta je **Provoz → Kontrola měření** (`/provoz/mereni`,
jen pro správce). Ukáže, co je nastavené v `.env`, jestli je v tomhle
prohlížeči marketingový souhlas a jestli se značka načetla — a tlačítkem
pošle zkušební konverzi a rovnou napíše, jestli odešla.

Zbytek téhle kapitoly je ruční varianta přes vývojářské nástroje.

V DevTools → Network **nefiltruj na `googleads`**. Značka se stahuje
z `googletagmanager.com`, slovo „googleads“ je až uvnitř jejího kódu,
takže ten filtr nenajde nic ani při dokonale funkčním měření.

Správné filtry:

| Co hledáš | Filtr | Kdy se to objeví |
|---|---|---|
| načtení značky | `gtag` | při každém načtení stránky (po souhlasu) |
| odeslání konverze | `conversion` | jen ve chvíli samotné konverze |

Odeslání konverze jde vynutit ručně, z konzole na kterékoli stránce
klidoo.cz:

```js
gtag('event', 'conversion', { send_to: 'AW-…/…' })
```

- Požadavek odletí → značka i souhlas jsou v pořádku a problém je
  v tom, že se naše volání nespustilo, nebo chybí štítek v `.env`.
- Neodletí nic → buď není `window.gtag`, nebo není marketingový
  souhlas. Obojí se pozná z `document.getElementById('google-ads')`
  a z `dataLayer`.

Zaškrtni **Keep log**, jinak se požadavek ztratí s přesměrováním,
které po konverzi většinou následuje.

Dokud konverze ani jednou neproběhla, hlásí u ní Google Ads **„Nesprávně
nakonfigurováno“**. Není to chyba nastavení konverze — jen ještě nikdy
nedostal data. Zmizí to sama pár hodin po prvním skutečném odeslání.

---

## Historie rozhodnutí

| Datum | Co | Proč |
|---|---|---|
| 2026-09-11 | Založen plán, kalkulačka výživného odložena | Dotaz obsazený finančními portály, záměr mimo produkt |
| 2026-09-11 | Doplněna konverzní značka do aplikace | GA4 na řízení kampaně nestačí, Ads potřebuje vlastní |
| 2026-09-11 | Měření přesunuto do kořenového layoutu | Mimo `(web)` a `(auth)` gtag vůbec neexistoval, takže konverze za založenou rodinu nešla odeslat |
| 2026-09-11 | Registrace přes Google se dopočítává na `/vitejte` | Prohlížeč odchází na účty Googlu dřív, než by se stihla změřit |
| 2026-09-11 | Souhlas přestal viset na `NEXT_PUBLIC_GA_ID` | Bez GA se Consent Mode nenastavil a Google konverze z EU zahazoval |
| 2026-09-11 | Přidána stránka Kontrola měření | Ověřování konverzí přes DevTools se nedá dělat při každé změně v `.env` |
