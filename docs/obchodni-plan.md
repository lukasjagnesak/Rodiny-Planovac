# Obchodní plán Klidoo — od provozu k příjmu

Stav k 25. září 2026. Živý dokument: u každého kroku se odškrtává, co je
hotové, a dopisuje, co z něj vyšlo. Pořadí kroků není libovolné — každý
stojí na tom předchozím.

---

## Na jednu obrazovku

Máme hotový, široký produkt, lidi na webu a nulu platících rodin. Úzké
hrdlo není aplikace — je to **cesta od zájmu k registraci a od registrace
k penězům**, a o té zatím skoro nic nevíme, protože měření polovinu
událostí zahazuje.

Tři věci, na kterých záleží, v tomhle pořadí:

1. **Vidět.** Opravit měření, jinak každé další rozhodnutí děláme naslepo.
2. **Přestat pálit peníze.** Reklama míří na dotazy, o kterých jsme si
   sami napsali, že je nemáme kupovat.
3. **Postavit motor.** Tím motorem nejsou reklamy, ale mediátoři —
   jediný kanál, který potká přesně našeho člověka ve chvíli, kdy nás
   potřebuje, a přinese k tomu důvěru.

Do té doby: **žádné nové funkce.**

---

## Kde jsme

Z měření za poslední týden (dotaz spuštěný 25. 9.):

| | |
|---|---|
| Lidí na `/kalkulacka-vyzivneho` | 198 |
| Stáhlo si PDF výpočtu | 1 |
| Registrací na celém webu | 1 |
| Platících rodin | 0 (ověřit dotazem níž) |

Výchozí stav celé firmy — **pustit a výsledek dopsat sem:**

```sql
select
  (select count(*) from auth.users)                                          as uctu,
  (select count(*) from families)                                            as rodin,
  (select count(*) from families f
     where (select count(*) from family_members m
            where m.family_id = f.id and m.role in ('owner','parent')) >= 2) as rodin_s_obema_rodici,
  (select count(*) from predplatna where stav = 'zkusebni' and plati_do > now()) as ve_zkusebni_dobe,
  (select count(*) from predplatna where stav = 'aktivni')                   as platicich,
  (select count(*) from leady)                                               as kontaktu,
  (select count(*) from partneri where aktivni)                              as partneru,
  (select count(*) from doporuceni)                                          as doporucenych_rodin;
```

---

## Závěry

### 1. Měření lže — a to i v číslech, která jsme viděli minule

Server přijímá jen 7 druhů událostí ze 15, které aplikace posílá. Zbylé
tiše zahodí (`lib/provoz.ts`, pole `DRUHY`). Mezi zahozenými jsou:

- všechny tři nové události z kalkulačky výživného — zadání, zobrazení
  nabídky a **klik na „Vyzkoušet zdarma"**,
- všechny tři události instalace na plochu,
- volba platby v průvodci.

Takže `kliklo_na_vyzkouset = 0` z minulého dotazu **neříká, že nikdo
neklikl.** Říká, že se to zapsat nedá. Dotaz „za tři až čtyři dny", který
jsem minule poslal, by ukázal nuly bez ohledu na to, co lidé dělají.

K tomu: kliknutí z Google Ads nenesou `utm_*` (Google používá `gclid`,
který neukládáme), takže v našich datech **nejde oddělit placenou
návštěvnost od ostatní.** Nevíme, kolik z těch 198 lidí jsme zaplatili.

### 2. Reklama míří tam, kam jsme si sami napsali, že nemá

`docs/google-ads.md`, kapitola o průzkumu konkurence:

> „Kalkulačka výživného" a „alimenty" jsou past. […] záměr za dotazem
> je „kolik budu platit", ne „potřebuju nástroj na koordinaci". Draho
> a mimo.

A v sestavách: **„Kalkulačka výživného — zatím nezakládat."** Jádro
rozpočtu (~50 %) mělo jít na dotazy typu *aplikace střídavá péče*,
*kalendář střídavé péče*, *plánovač střídavé péče* — tam je přesný záměr
a skoro žádná konkurence.

Kampaň běží přesně obráceně. 198 lidí a jedna registrace odpovídá tomu,
co jsme čekali: člověk, který hledá číslo, si číslo spočítá a odejde.

> Kalkulačka výživného není špatná stránka. Je to **horní patro
> trychtýře**: sbírá lidi dřív, než aplikaci potřebují. Měří se kontakty
> (PDF) a to, kolik z nich e-maily dovedou k registraci — ne přímé
> registrace. Kupovat na ni placený provoz jako na hlavní vstup je chyba.

### 3. Produkt není úzké hrdlo

Aplikace má 18 sekcí: kalendář, děti, doklady, kontakty, kroužky,
oznámení, školní rozvrh a EduPage, souhrn pro soud, události, úkoly,
výdaje s účtenkami, zprávy, Google kalendář, notifikace, partnerský
program, měření provozu. Platících rodin nula.

Každá další funkce teď prodlužuje cestu k „aha" a nic nepřináší.
**Stop novým funkcím**, dokud trychtýř nefunguje. Výjimky: chyby, věci
blokující aktivaci nebo platbu. Úkoly „ořez účtenky" a „čtečka školních
novinek" se odkládají.

### 4. Mezi zájmem a registrací chybí mezičlánek

- Ze šesti materiálů, za které sbíráme e-mail, má navazující sekvenci
  **jediný** (vzor dohody) a ta má **jeden** e-mail. Kontakty z PDF
  výživného, z checklistu, z newsletteru už nikdy nic nedostanou.
- Kdo se zaregistruje, dostane za 30 dní zkušební doby **jediný** e-mail
  — že končí. Nic, co by ho mezitím dovedlo k pozvání druhého rodiče,
  k prvnímu výdaji, k tomu, aby aplikaci začal používat.

Registrace bez aktivace je náklad. Kontakt bez sekvence je řádek
v tabulce.

### 5. Placené vyhledávání se při téhle ceně samo nezaplatí

Hrubý počet (předpoklady jsou odhad, přepsat skutečnými čísly, až budou):

| | Dotazy na nástroj | Kalkulačka výživného |
|---|---|---|
| Cena za proklik | ~12 Kč | ~12 Kč |
| Návštěva → registrace | ~3 % | ~0,5 % (naměřeno) |
| Registrace → platba | ~10 % | ~10 % |
| **Cena za platící rodinu** | **~4 000 Kč** | **~24 000 Kč** |

Platící rodina přinese v prvním roce kolem **1 800 Kč** (mix ročních
1 990 Kč a měsíčních 199 Kč s odchody). I nejlepší sestava je v prvním
roce ve ztrátě; kalkulačka výživného je ve ztrátě řádově.

Vyrovnat to může jen **dlouhá doba předplatného** — střídavá péče trvá
roky, klidně do plnoletosti dětí — a to zatím nevíme. Proto: reklamy
jako **zdroj poznání a sklizeň přesného záměru se stropem**, ne jako
motor.

### 6. Nejsilnější kanál je nejméně rozjetý

Mediátor sedí naproti přesně našemu člověku, ve chvíli, kdy se domlouvá
rozvrh, a má jeho důvěru. Provize 25 % je v prvním roce kolem 450 Kč na
rodinu — **desetina** ceny z reklamy. Jeden aktivní mediátor s pár
rodinami měsíčně přinese víc než celý dnešní rozpočet na reklamu.

Máme hotové texty oslovení (`docs/oslovovani-mediatoru.md`), stránku
`/pro-mediatory`, sledování doporučení i přehled provizí. Chybí to
hlavní: **oslovení samotné**, podklady, které mediátor dá klientovi do
ruky, a ukázka, kterou může pustit na sezení.

A jedna podmínka: první mediátorka, která se na Klidoo podívala, napsala,
že je na něm poznat AI — vzhled, překlepy, fráze. Mediátor doporučuje
svým jménem. **Dokud Klidoo nepůsobí důvěryhodně, partnerský kanál
nepojede,** ať pošleme e-mailů kolik chceme.

### 7. Důvěra je předpoklad, ne kosmetika

Člověk v rozvodu svěřuje aplikaci údaje o dětech, o penězích a zprávy
s bývalým partnerem — často s vědomím, že to jednou může číst soud.
Nedůvěřuje ničemu, co působí narychlo. Co dnes chybí nebo je rozpracované:

- směr nového designu — návrh A/B/C čeká na výběr,
- ikony — rozpracované,
- opravy textů — čekají na vyplněný `exporty/texty.csv`,
- **kdo za Klidoo stojí** — web mluví hlasem Lukáše, provozovatelem je
  Šárka Jagnešáková. Nesoulad, který si pozorný čtenář všimne,
- žádný skutečný hlas zákazníka (a vymýšlet ho nebudeme).

### 8. Cena teď není problém

Při jedné registraci týdně se o ceně nedá nic zjistit a každá změna by
byla střelba naslepo. 199 Kč měsíčně / 1 990 Kč ročně za celou rodinu,
30 dní bez karty — **nechat, dokud nebude aspoň 20 rodin ve zkušební
době** a neuvidíme, kolik jich zaplatí.

---

## Pro koho to je

### Kupující: rodič, který drží provoz

- **Situace:** první rok po rozchodu, dítě (nebo děti) ve střídavé péči
  nebo v široké péči obou rodičů. Rozvrh je dohodnutý nebo se právě
  dohaduje.
- **Kdo:** ten z rodičů, na kterém leží organizace — hlídá rozvrh,
  kroužky, platby. 30–45 let, v telefonu jako doma.
- **Bolest:** „Pořád se dohadujeme, kdo má kdy děti, kdo co zaplatil
  a kdo veze na kroužek. A mám pocit, že dělám víc, než je vidět."
- **Co chce slyšet:** že bude klid a že bude vidět, jak to je — černé
  na bílém, pro oba.
- **Za co zaplatí:** za klid v provozu a za **doklad** — přehled péče
  a nákladů, který jde přiložit, když na to dojde. Listiny pro soud
  a advokáta jsou dnes jediné, co se bez předplatného zamyká. To je
  správně a v marketingu je to skoro neviditelné.

### Kdy nás potřebuje (a kde je v tu chvíli)

| Chvíle | Kde ho potkáme |
|---|---|
| Dohoda o péči se právě dělá | **u mediátora, u advokáta** |
| Hledá, jak to celé zorganizovat | vyhledávání „aplikace / kalendář střídavé péče" |
| První spor o peníze | vyhledávání, články o výdajích |
| Prázdniny, Vánoce | sezónní obsah, sociální sítě |
| Počítá výživné | kalkulačka — **na registraci ještě brzy**, na kontakt akorát |

### Druhý rodič

Neplatí a často se nepřidá hned — u sporných rozchodů možná nikdy.
Aplikace proto musí mít hodnotu i pro jednoho („Začít můžete i bez
druhého rodiče" to na webu slibuje). Připojení druhého rodiče je nejsilnější
známka, že rodina zůstane — měřit, ale nepodmiňovat jím nic.

### Mediátor a advokát

Není zákazník, je **kanál**. Chce, aby dohoda vydržela a aby se klienti
nevraceli s hádkou o tábor. Nechce riskovat svou pověst a nesmí vypadat
zaujatě — proto provize nahlas.

### Pro koho to není

Rodiče, kteří se domluví sami a bez tření — nemají bolest. A vysoce
konfliktní dvojice, které hledají zbraň proti druhému — Klidoo ukazuje
totéž oběma, na tom stojí jméno i vztah s mediátory.

---

## Obchodní model

**Jak vyděláváme:** předplatné rodiny (platí jedna domácnost, přístup mají
všichni). Později možná licence pro mediátory a kanceláře — jen hypotéza,
ověří se rozhovory v kroku 6.

**Kolik je „funkční model":**

| Měsíční příjem | Platících rodin (při ~166 Kč/měs.) |
|---|---|
| 10 000 Kč | ~60 |
| 50 000 Kč | ~300 |
| 100 000 Kč | ~600 |

Trh na to stačí: ročně se v Česku rozvádí řádově 20 tisíc manželství,
zhruba polovina s nezletilými dětmi, k tomu rozchody nesezdaných rodičů
a stále větší podíl střídavé péče. Rodin se dvěma domovy jsou desítky
tisíc. *(Řádový odhad — před použitím kdekoli venku ověřit v ČSÚ.)*
300 rodin je zlomek procenta. **Omezení není trh, je to distribuce.**

**Cíle:**

- **30 dní:** měření v pořádku; 20 registrací se založenou rodinou;
  3 mediátoři, kteří Klidoo aktivně doporučují; první platící rodina.
- **90 dní:** 10 platících rodin; 10 aktivních partnerů; víme, kolik
  stojí platící rodina v každém kanálu a kolik ze zkušební doby zaplatí.
- **12 měsíců:** 300 platících rodin, tj. ~50 000 Kč měsíčně. Ambice,
  která stojí na partnerském kanálu; po 90 dnech ji přepočítáme podle
  skutečných čísel.

---

## Road mapa

Každý krok má **hotovo, když** — bez něj se nejde dál. U kroků je
poznačeno, co je práce v kódu (dělám já) a co je práce venku (děláte vy,
já připravím podklady).

### Krok 0 — Měření, kterému se dá věřit
*Kód, řádově hodina. Všechno ostatní na tom stojí.*

- [x] **0.1** Server přijímá všechny druhy událostí, které aplikace
      posílá. Test, který porovná seznam v klientu se seznamem na serveru
      — tahle chyba se nesmí vrátit tiše.
- [x] **0.2** *Hotovo v kódu:* proklik s `gclid` (na iPhonu `gbraid`,
      `wbraid`) se sám označí jako `google / cpc`. Přípona níž je už jen
      pro podrobnosti o kampani a sestavě — nepovinná.
      Google Ads → nastavení kampaně → **přípona konečné URL**:
      `utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={adgroupid}`.
      *Bez kódu, v Google Ads.* Pak půjde placená návštěvnost oddělit.
- [ ] **0.3** Výchozí stav firmy — dotaz nahoře, čísla dopsat do
      kapitoly „Kde jsme".
- [x] **0.4** *Pro kalkulačku výživného hotovo* — v `/provoz`, vedle sebe
      všichni a lidé z reklamy. Pro celý web zbývá.
      V `/provoz` jeden trychtýř: zobrazení → zadání → nabídka
      vidět → klik → registrace → rodina → druhý rodič → platba,
      rozdělený podle vstupní stránky a podle toho, jestli je návštěva
      placená.

**Hotovo, když:** o každém kroku cesty víme, kolik lidí ho udělalo
a odkud přišli.

### Krok 1 — Přesměrovat rozpočet
*Bez kódu. Vy v Google Ads, já připravím přesné nastavení.*

- [ ] **1.1** Kalkulačka výživného: **pevný strop** (návrh 30 Kč/den)
      nebo pauza. Rozhodnout podle 0.2 — kolik z těch 198 lidí byla
      reklama.
- [ ] **1.2** Spustit sestavu **Nástroj** (vstupní stránka `/`)
      a **Značka** podle `docs/google-ads.md`.
- [ ] **1.3** Jednou týdně vyhledávací dotazy → vylučovat.

**Hotovo, když:** víc než polovina rozpočtu jde na dotazy s úmyslem
„nástroj".
**Rozhodnutí po 14 dnech:** cena za registraci podle sestavy — co
nefunguje, vypnout.

### Krok 1b — Stránka kalkulačky výživného (hotovo 25. 9.)

Podle boardu „Kalkulačka výživného — návrh". Na telefonu:

| | Předtím | Teď |
|---|---|---|
| První pole | na konci 1. obrazovky | v polovině 1. obrazovky |
| Výsledek | v 1,6. obrazovce | v 1,06. obrazovce, při vyplňování v liště dole |
| Tlačítko „Vyzkoušet" | v 1,7. obrazovce | v jednom pohledu s částkou |
| Viditelných polí | 8 | 4 |
| Tlačítek „Vyzkoušet" | 5 | 3 (pruh, rozcestí, konec) |

Pod výsledkem rozcestí: *už se střídáte* → aplikace s přeneseným
výpočtem, *teprve se domlouváte* → PDF na e-mail.

**Vyhodnotit po 14 dnech** v `/provoz` → Kalkulačka výživného: kolik
lidí došlo k nabídce a jak se rozdělili mezi aplikaci a PDF.

### Krok 2 — Mezičlánek: e-maily
*Kód a texty. Texty napíšu, vy schválíte.*

- [ ] **2.1** Sekvence pro kontakty z **PDF výživného** — 4 e-maily za
      14 dní: co s číslem dál → dohoda a vzor → na čem se rodiče po
      dohodě nejčastěji rozhádají → Klidoo, 30 dní zdarma.
- [ ] **2.2** **Aktivační sekvence po registraci** — den 0 (jedna věc,
      kterou udělat hned), den 2 (pozvat druhého rodiče, nebo jak to
      používat sám), den 5 (první výdaj a účtenka), den 12 (souhrn —
      co už je v aplikaci zapsané), den 25 (co se po konci zkušební doby
      zamkne a co zůstane). Konec zkušební doby už existuje.
- [ ] **2.3** Sekvence pro checklist a newsletter — kratší, 2–3 e-maily.

**Hotovo, když:** žádný kontakt ani registrace nezůstanou bez dalšího kroku.

### Krok 3 — Důvěra
*Kód, s vaším výběrem. Běží souběžně s krokem 2.*

- [ ] **3.1** Vybrat směr designu z návrhu A/B/C. Nasadit **nejdřív na
      čtyři stránky**, které rozhodují: `/`, `/kalkulacka-vyzivneho`,
      `/pro-mediatory`, `/cenik`. Aplikace až potom.
- [ ] **3.2** Ikony — ubrat zhruba dvě třetiny, zbytek sjednotit.
- [ ] **3.3** Opravy textů z `exporty/texty.csv` (čeká na vás).
- [ ] **3.4** **Kdo za tím stojí:** skutečná tvář, dvě věty proč, jeden
      hlas na celém webu. Sjednotit s tím, kdo je provozovatel.
- [ ] **3.5** Stránka o bezpečí dat: kde leží, kdo je vidí, co vidí
      druhý rodič, co se stane po zrušení. Pro tuhle skupinu je to
      otázka číslo jedna.

**Hotovo, když:** mediátor, který web uvidí poprvé, nemá důvod se
zarazit. Ověřit na jednom skutečném mediátorovi.

### Krok 4 — Partnerský kanál
*Převážně venku. Vy oslovujete, já připravím podklady a nástroje.
Oslovovat až po 3.1–3.4.*

- [ ] **4.1** Seznam 50 mediátorů se zaměřením na rodinnou mediaci
      (veřejný seznam zapsaných mediátorů), seřazený podle města.
- [ ] **4.2** Oslovení v dávkách po 10 týdně, připomenutí po 5 dnech.
      Texty jsou v `docs/oslovovani-mediatoru.md`.
- [ ] **4.3** Podklady pro klienty: leták A5 s QR kódem, ve kterém je
      partnerův `ref`, a krátký návod „naklikejte si to přímo na sezení".
- [ ] **4.4** Ukázkový účet s vymyšlenými daty, který mediátor pustí
      klientům na sezení.
- [ ] **4.5** Odkaz na partnerský přehled z `/pro-mediatory`.
- [ ] **4.6** Po prvních 5 partnerech: krátký rozhovor — co jim chybí,
      zaplatili by za licenci pro klienty?

**Hotovo, když:** 5 partnerů poslalo aspoň jednu rodinu.

### Krok 5 — Aktivace v aplikaci
*Kód. Až budou data z kroku 0.*

- [ ] **5.1** Měřit každý krok průvodce — kde lidé odpadají.
- [ ] **5.2** Zkrátit průvodce podle toho, co data ukážou (kandidáti:
      rodina a děti v jednom kroku, volba platby až v aplikaci).
- [ ] **5.3** Barevný kalendář do dvou minut od registrace — to je
      moment, kdy člověk pochopí, k čemu to je.
- [ ] **5.4** Hodnota pro jednoho rodiče, když se druhý nepřidá.

**Hotovo, když:** víc než polovina registrací založí rodinu a do týdne
zapíše aspoň jednu věc.

### Krok 6 — Peníze
*Až bude aspoň 20 rodin ve zkušební době.*

- [ ] **6.1** Změřit, kolik rodin po zkušební době zaplatí a proč ty
      ostatní ne (krátký dotaz v e-mailu po konci).
- [ ] **6.2** Ověřit, jestli lidé používají listiny pro soud a advokáta.
      Pokud ano, dát je do popředí webu i e-mailů.
- [ ] **6.3** Licence pro mediátory a kanceláře — jen pokud ji v 4.6
      aspoň dva partneři chtěli.
- [ ] **6.4** Cena — podle dat, ne podle pocitu.

### Krok 7 — Obsah a sociální sítě
*Průběžně, nízká priorita.*

Deset článků je naplánovaných do 9. 12., kalendář příspěvků do konce
roku je v `docs/socialni-site.md`. Nic nového nepsat, dokud nebude
vidět, **který obsah vede k registraci**. Co nevede, utlumit.

---

## Co teď nedělat

- **Nové funkce.** Ani malé.
- **Měnit cenu.** Bez dat to je hádání.
- **Kupovat návštěvnost na kalkulačku výživného bez stropu.**
- **Soudit kalkulačku výživného podle registrací.** Je to horní patro,
  soudí se podle kontaktů a podle toho, kolik z nich e-maily dovedou dál.
- **Vymýšlet recenze, čísla uživatelů nebo loga partnerů.** U téhle
  skupiny a u mediátorů by to Klidoo zabilo.
- **Oslovovat mediátory dřív, než bude hotový krok 3.** Druhý první
  dojem už nedostaneme.

---

## Otevřené otázky

1. Kolik mediátorů už bylo osloveno a s jakým výsledkem?
2. Kolik reklama za poslední týden utratila a kolik měla prokliků?
3. Kdo má být na webu „tváří" Klidoo — Lukáš, Šárka, nebo oba?
4. Směr designu A, B, nebo C?
5. Kdy budou hotové opravy textů v `exporty/texty.csv`?
