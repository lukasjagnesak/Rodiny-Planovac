# Facebook a Instagram reklama pro Klidoo

Živý dokument stejně jako `docs/google-ads.md`: každá změna v kampani sem
patří i s důvodem.

---

## Jak se to liší od Googlu

Na Googlu člověk **hledá** — napíše „aplikace střídavá péče" a my
odpovídáme. Na Facebooku **nehledá nic**, roluje. Reklama ho musí zastavit
něčím, co pozná jako svoje, a první krok musí být malý. Proto:

- **Vstupní stránka `/vyzkouset`**, stejná jako pro Google: dvě klepnutí a
  člověk vidí svůj vlastní měsíc v barvách obou domácností. Registrace
  až potom, jako „uložit si to".
- **Optimalizovat na „Lead", ne na registraci.** Facebook se učí z desítek
  konverzí týdně a registrací tolik zatím nebude. „Lead" je u nás
  naklikaný rozpis (`rozvrh-zadani`) — lidí, kteří si ho naklikají, bude
  řádově víc a podobají se těm, kdo se registrují.

---

## Spuštění krok za krokem

### 1. Pixel

Kód pixelu v aplikaci je hotový (`lib/marketing.ts`). Chybí jen ID.

Events Manager → Zdroje dat → Přidat → Web → **Meta pixel**. Zkopírovat
**ID pixelu** (jen číslice) a na serveru:

```bash
ssh root@37.27.249.24
cd /opt/klidoo
nano .env          # doplnit řádek: NEXT_PUBLIC_META_PIXEL_ID=<číslo>
./deploy/update.sh # NEXT_PUBLIC_* se čte při sestavení — restart nestačí
```

Pixel se načte **až po souhlasu s marketingovými cookies**. Bez souhlasu
nic neposílá, a tak Facebook konverze podhodnocuje. Pravda je v `/provoz`.

### 2. Ověřit, že pixel opravdu posílá

U Google značky jsme měli chybu, kvůli které se týdny neodeslala ani
jedna konverze, přestože se skript načítal. Tady se to ověří dřív, než
se utratí první koruna:

1. V Chromu doplněk **Meta Pixel Helper**.
2. Otevřít `https://klidoo.cz/vyzkouset`, v liště souhlasu **Přijmout vše**.
3. Helper musí ukázat **PageView**.
4. Klepnout na „2-2-3" — Helper musí ukázat **Lead**.
5. Events Manager → **Test Events** — obě události tam musí být i ze
   serveru Facebooku, ne jen v doplňku.

Události, které aplikace posílá:

| Co člověk udělá | Událost v Klidoo | Na Facebooku |
|---|---|---|
| Naklikal rozpis na `/vyzkouset` | `rozvrh-zadani` | **Lead** |
| Zaregistroval se | `registrace` | CompleteRegistration |
| Založil rodinu | `rodina` | StartTrial |
| Zaplatil | `predplatne` | Purchase |

### 3. Kampaň

Ads Manager → Vytvořit → cíl **Potenciální zákazníci** (Leads) →
místo konverze **Web** → událost **Lead**.

- Rozpočet **150–200 Kč/den** na úrovni kampaně.
- Lokalita **Česko**, jazyk čeština.
- Publikum **Advantage+** (široké) s věkem 25–55. Úzké zájmové cílení
  na malém trhu drží reklamu na malé skupině a zdražuje ji; kreativa
  si publikum vybere sama — rodič ve střídavé péči se u barevného
  kalendáře zastaví, jiní ne.
- Umístění **Advantage+** (Facebook, Instagram, Reels, Stories).

**Adresa webu:** `https://klidoo.cz/vyzkouset`

**Parametry adresy URL** (pole „URL parameters" v reklamě) —
**povinné**, bez nich se návštěva z Facebooku v našem měření nepozná:

```
utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}
```

Facebook přidává ke každému odkazu `fbclid`, i ke sdílenému příspěvku
zdarma, a tak se podle něj placená návštěva poznat nedá. Podle
`utm_medium=paid_social` ano.

### 4. Kreativa

Hlavní motiv je **barevný kalendář**. Je to jediná věc, kterou rodič ve
střídavé péči pozná na první pohled jako svou. Tři varianty, ať Facebook
zjistí, která zabírá:

**A — video 6–10 s (nejdůležitější).** Záznam obrazovky telefonu na
`/vyzkouset`: prst klepne „2-2-3", pak „U mě", a měsíc se přebarví.
Titulek přes video: *U koho jsou děti příští týden?* Bez hudby s textem
(většina lidí má zvuk vypnutý).

**B — obrázek 4 : 5.** Čistý snímek kalendáře na čtyři týdny ve dvou
barvách, nahoře velkým písmem *Týden u vás, týden u druhého. A kdo veze
na fotbal?*

**C — obrázek s textem.** Krémový podklad, velkým písmem:
*Kdo má děti o Vánocích? Kdo zaplatil tábor? Napsané jednou, vidí to
oba.* Dole malý kalendář a logo.

**Hlavní text** (první řádek je to, co se zobrazí; zbytek je pod „více"):

```
U koho jsou děti příští týden? Klepněte, jak se střídáte, a uvidíte celý měsíc dopředu.
Rozpis si pak uložte do Klidoo — uvidí ho i druhý rodič. 30 dní zdarma, bez karty.
```

```
Týden a týden, 2-2-3, nebo každý druhý víkend. Dvě klepnutí a máte kalendář na měsíc.
Kroužky, výdaje a výjimky přidáte v aplikaci. Druhý rodič neplatí nic.
```

**Nadpis** (pod obrázkem, do 40 znaků):

```
Rozvrh dětí na měsíc dopředu
Kalendář pro dva domovy
Uvidíte to vy i druhý rodič
```

**Tlačítko:** *Zjistit víc* (ne „Zaregistrovat se" — první krok je
kalendář, ne účet).

### 5. Pravidla textů

- **Mluvit o situaci, ne o čtenáři.** Ne „Rozvádíte se?", „Jste
  rozvedený?" — to Facebook zamítne (pravidla o osobních vlastnostech)
  a člověk se cítí sledovaný. Ano „Týden u vás, týden u druhého".
- Žádné sliby, které stránka nesplní. Stránka ukazuje kalendář a stojí
  za ní 30 dní zdarma bez karty — nic víc nesmí reklama tvrdit.
- Žádné vymyšlené recenze ani čísla uživatelů.

---

## Na co se dívat

Po **7 dnech**, ne dřív — Facebook první dny „se učí" a čísla skáčou.

1. **Cena za Lead** (naklikaný rozpis) v Ads Manageru. Orientačně: pod
   30 Kč dobré, nad 80 Kč reklama nezastavuje ty správné lidi → jiná
   kreativa.
2. `/provoz` → **Vstupní stránka /vyzkouset**, sloupec **Facebook a
   Instagram**: kolik z těch, co naklikali rozpis, klikne na uložení a
   kolik se zaregistruje. Tady je pravda — Ads Manager vidí jen lidi se
   souhlasem.
3. Které z variant A/B/C přivádějí Lead nejlevněji → ostatní vypnout,
   k vítězi přidat obměnu.

Rozhodnutí po 14 dnech: **cena za registraci** z Facebooku proti Googlu.
Kam dát víc peněz, určuje tohle číslo, ne počet prokliků.
