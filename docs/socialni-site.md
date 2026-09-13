# Sociální sítě Klidoo

Živý dokument. Co se vyzkouší, sem patří i s výsledkem — za půl roku už
nikdo neví, proč se přestalo psát na X.

---

## Nejdřív jedna nepříjemná věta

Sociální sítě u tohohle produktu **nejsou kanál akvizice**. Nikdo si
nepořídí aplikaci na střídavou péči proto, že viděl hezký příspěvek.
Pořídí si ji ve chvíli, kdy má problém — a tu chvíli sbírá vyhledávání,
ne feed.

K čemu sítě jsou:

1. **Důkaz, že za tím někdo je.** Člověk, který uvidí reklamu nebo dostane
   doporučení od mediátora, si Klidoo prokliká. Prázdný profil s jedním
   příspěvkem z loňska je důvod k nedůvěře.
2. **Zásoba obsahu na skupiny.** Skutečná síla je ve facebookových
   skupinách rodičů, a tam se nedá chodit s prázdnýma rukama.
3. **Kontakt s lidmi, kteří to používají.** Odpověď v komentáři je levnější
   podpora než e-mail a vidí ji ostatní.

Podle toho se odvíjí i to, kolik do toho dávat: **tři hodiny týdně, ne
patnáct.**

---

## Pořadí sítí

| Síť | Váha | Proč |
|---|---|---|
| **Facebook** | 70 % | Tady je publikum. Českým rodičům mezi 30 a 45 lety je Facebook pořád hlavní síť a rodičovské skupiny mají desítky tisíc členů. |
| **Instagram** | 25 % | Mladší, vizuální. Dobré pro krátká videa z aplikace a pro důvěryhodnost. Dosah bez placení je malý. |
| **X** | 5 % | V Česku je to menšinová síť s jiným publikem — technologie a politika, ne rodičovství. Nestojí za vlastní obsah. |

**Na X jen překlápěj** to, co vzniklo jinam, a neřeš výsledky. Zrušit ho
ale nemá cenu: účet se jménem značky je lepší mít obsazený, než ho
jednoho dne najít u někoho cizího.

---

## Tón

Tohle je jediná část, kterou nejde odbýt. Publikum je uprostřed nejhoršího
období svého života a pozná faleš na první větu.

**Nikdy:**

- Neoslovuj čtenáře jeho situací. „Rozvádíte se?“, „Máte děti ve střídavé
  péči?“ Je to laciné a na Meta reklamách je to rovnou proti pravidlům.
- Neradíme, jak vychovávat. Klidoo je nástroj na provoz, ne poradna.
- Žádné hodnocení druhého rodiče. Ani v žertu, ani v komentářích.
  Polovina publika **je** ten druhý rodič.
- Žádná právní rada. „Soud obvykle rozhoduje…“ je věta, kterou nemáme
  právo napsat. Odkazuj na advokáta nebo na vlastní stránky, kde je to
  podložené.
- Žádné emoji v roli nadpisu. Tady to nepůsobí přátelsky, ale nevážně.

**Vždycky:**

- Mluv o **situaci**, ne o čtenáři. Ne „vy se hádáte“, ale „ve čtvrtek si
  oba mysleli, že veze ten druhý“.
- Konkrétní detail místo obecné pravdy. Ne „koordinace je náročná“, ale
  „jarní prázdniny má každý okres jindy a ten rozdíl je celý týden“.
- Krátké věty. Lidé to čtou večer, unavení, na mobilu.
- Klid. Značka se jmenuje Klidoo, ne Bojoo.

---

## Sloupy obsahu

Čtyři, střídat je. Pátý sloup je nic — když není co říct, nepíše se.

### 1. Mikro-návod (nejčastější)

Jedna praktická věc o provozu dvou domovů, kterou si člověk odnese, i
kdyby si Klidoo nikdy nezaložil. Tohle buduje důvěru rychleji než cokoli
jiného.

### 2. Scéna

Tři až pět vět z běžného týdne, které oba rodiče poznají. Bez pointy
o aplikaci. Prodává to samo tím, že je to přesné.

### 3. Z aplikace

Snímek obrazovky nebo krátké video a věta o tom, co to řeší. Ne výčet
funkcí — jeden problém, jedna obrazovka.

### 4. Sezóna

Školní rok má pevné body, kde se koordinace láme: začátek školy, podzimní
prázdniny, **Vánoce** (zdaleka nejtěžší), pololetí, jarní prázdniny,
tábory. Na každý z nich se dá napsat něco užitečného dva týdny předem.

---

## Kolik a kdy

- **Facebook:** 3× týdně — úterý, čtvrtek, neděle
- **Instagram:** 2× týdně — z toho aspoň jedno krátké video
- **X:** co se hodí, bez rozvrhu

Nejlepší čas je **po deváté večer**. Tohle publikum má do té doby děti,
úkoly a nádobí.

Nepiš ob den. Čtyři měsíce po třech příspěvcích týdně udělají víc než
tři týdny každodenního nadšení a pak ticho.

---

## Odkazy a měření

**Každý odkaz musí mít UTM**, jinak se v `/provoz` schová mezi přímé
návštěvy a nepoznáš, jestli to celé k něčemu je.

| Odkud | Adresa |
|---|---|
| Facebook, příspěvek | `https://klidoo.cz/?utm_source=facebook&utm_medium=social&utm_campaign=prispevek` |
| Facebook, skupina | `https://klidoo.cz/?utm_source=facebook&utm_medium=skupina&utm_campaign=diskuze` |
| Instagram, bio | `https://klidoo.cz/?utm_source=instagram&utm_medium=social&utm_campaign=bio` |
| X | `https://klidoo.cz/?utm_source=x&utm_medium=social&utm_campaign=prispevek` |

Měření čte `utm_source`, `utm_medium` a `utm_campaign` — jiné parametry
zahodí. Kanál pak najdeš v `/provoz` jako `facebook / social`.

Na Facebooku dávej odkaz **do prvního komentáře**, ne do příspěvku.
Algoritmus potlačuje příspěvky, které vedou pryč ze sítě.

---

## Facebookové skupiny — kde se to opravdu láme

Tady je publikum, které jinde nekoupíš. A tady se taky dá nejrychleji
zničit pověst.

**Pravidla, která si drž bez výjimky:**

1. **Přečti si pravidla skupiny.** Většina českých rodičovských skupin má
   propagaci zakázanou a vyhazuje bez varování.
2. **Nikdy nepiš z falešného účtu** a nikdy si nenechávej „doporučit“
   někým, komu za to zaplatíš. Když to praskne — a praská to — je to
   konec značky u publika, které stojí na důvěře.
3. **První odpověď nikdy neobsahuje odkaz.** Odpověz na dotaz tak, aby to
   člověku pomohlo, i kdyby Klidoo neexistovalo. Odkaz až když se někdo
   zeptá čím, nebo v druhé odpovědi.
4. **Zeptej se správce.** Napiš mu na rovinu, co děláš, a zeptej se, jestli
   může být Klidoo zmíněné, když se někdo ptá na nástroj. Překvapivě často
   řeknou ano — a pak už jsi tam legálně.
5. **Piš pod vlastním jménem**, ne za značku. „Dělám na aplikaci Klidoo“
   je poctivé a lidi to berou. „My v Klidoo“ ve skupině vypadá jako spam.

Dotazy, u kterých má smysl být: rozpis střídavé péče, dělení prázdnin,
kdo platí kroužky, jak se počítají noci, jak se domluvit bez hádky přes
SMS.

---

## Kalendář příspěvků do konce roku

Připravené k vložení. Formátování je pro Facebook; na Instagram jde stejný
text do popisku, na X se zkrátí na první odstavec. **Odkaz vždycky do
prvního komentáře**, ne do příspěvku.

U příspěvků navázaných na článek je odkaz uvedený. Data vydání článků
jsou v `src/obsah/clanky/` — příspěvek nesmí vyjít dřív než text, na
který odkazuje.

---

### Září — základ důvěry

Tři týdny bez prodeje. Kdo přijde na prázdný profil, musí najít něco, co
mu pomůže, ne nabídku.

**Út 15. 9. · scéna**

> Ve čtvrtek jsem stál před školou a čekal.
>
> Ona taky. O dvě ulice dál, před kroužkem.
>
> Oba jsme si byli jistí. Oba jsme měli pravdu — každý podle jiné SMS
> z jiného týdne.
>
> Tohle nejsou spory. Tohle je provoz. A provoz se nedá vyřešit tím, že
> se oba budeme víc snažit si pamatovat.

**Čt 17. 9. · mikro-návod**

> **Proč se ve střídavé péči počítají noci, a ne dny?**
>
> Protože den strávíte s dítětem oba. Ráno ho jeden vypraví, odpoledne ho
> druhý vyzvedne. Noc má jen jeden.
>
> Je to jediná jednotka, na které se dá shodnout bez dohadování o tom, co
> se počítá jako „mít dítě u sebe“.

*Odkaz: `/clanky/jak-se-pocitaji-noci-ve-stridave-peci`*

**Ne 20. 9. · scéna**

> „Mně nikdo nic neřekl.“
>
> Čtyři slova, která v rodině se dvěma domovy zaznějí častěji než
> kterákoli jiná.
>
> A skoro vždycky je to pravda. Někdo to řekl — jen někomu jinému, v jiné
> aplikaci, nebo dítěti, které to zapomnělo.

**Út 22. 9. · mikro-návod**

> **Tři věty, které do dohody patří, a skoro nikdy tam nejsou.**
>
> 1. Kdo dítě předává a kde. Ne „po dohodě“ — konkrétní místo.
> 2. Do kdy se hlásí změna. Třeba 48 hodin, kromě nemoci.
> 3. Od jaké částky se výdaj domlouvá předem.
>
> Dohoda se nerozbíjí na velkých věcech. Rozbíjí se na tom, že v ní něco
> není a každý si to doplnil jinak.

*Odkaz: `/clanky/co-patri-do-dohody-o-stridave-peci`*

**Čt 24. 9. · z aplikace**

> Nejčastější otázka k přehledu: proč tam svítí 47 % a ne 50?
>
> Protože střídání po týdnu skoro nikdy nevyjde na půl. Přehozený víkend
> kvůli svatbě. Tři dny nemoci u toho, kdo si mohl vzít volno. Prázdniny
> u toho, kdo měl dovolenou.
>
> Nic z toho není problém. Problém je, když se o tom po roce mluví zpětně
> a každý si pamatuje jiná čísla.

*Snímek obrazovky s přehledem nocí.*

**Ne 27. 9. · mikro-návod**

> **Předávání dětí ve škole.**
>
> Zní to neosobně a v prvním roce po rozchodu to bývá to nejlaskavější
> řešení, jaké existuje. Jeden rodič dítě ráno přivede, druhý ho
> odpoledne vyzvedne. Nikdo nemusí stát v cizí předsíni a nikdo nemusí
> mluvit, když na to zrovna nemá.
>
> Dítě navíc nezažije žádné předávání. Jen jde do školy a ze školy.

**Út 29. 9. · scéna**

> Tři roky jsme si psali o všem v esemeskách.
>
> Když se loni řešilo, kdo platil lyžák, otevřel jsem konverzaci a
> scrolloval čtyřicet minut.
>
> Nenašel jsem to. Našel jsem ale osm hádek, na které jsem už zapomněl.

---

### Říjen — praktický měsíc

Školní rok běží, provoz se usazuje a vyplouvají první opakované problémy.
Nejvděčnější měsíc na návody.

**Čt 1. 10. · mikro-návod**

> **Ředitelské volno je nejpodceňovanější položka roku.**
>
> Přijde s pár týdny výstrahy, je to jeden až dva dny uprostřed týdne
> a znamená, že si někdo musí vzít volno v práci.
>
> Pravidlo, které drží: volno bere ten, u koho dítě zrovna je. Je to nudné
> a právě proto to funguje — nedá se o tom vyjednávat.

**Ne 4. 10. · scéna**

> Dcera se mě zeptala, jestli si mám zapsat, že ve středu nemá kroužek.
>
> Je jí devět.
>
> To byl den, kdy mi došlo, že si to pamatuje za nás oba.

**Út 6. 10. · mikro-návod**

> **Jarní prázdniny nejsou pro celé Česko stejné.**
>
> Rozdělují se po okresech a rozdíl mezi dvěma sousedními může být i šest
> týdnů. Věta „jarní prázdniny dělíme napůl“ je proto u rodiny, kde každý
> rodič bydlí jinde, věta o ničem.
>
> Napište do dohody konkrétní okres. Nejpraktičtější je okres školy — dítě
> má volno podle ní, ne podle bydliště rodiče.

*Odkaz: `/clanky/prazdniny-a-volno-ve-skolnim-roce`*

**Čt 8. 10. · z aplikace**

> České školní prázdniny jsou v Klidoo rovnou v kalendáři. Včetně jarních
> podle okresu.
>
> Nemusíte je opisovat z webu školy ani hlídat, kdy vyjdou.

**Ne 11. 10. · mikro-návod**

> **Kdo chodí na třídní schůzky?**
>
> Nejčastější odpověď je „ten, komu to vyjde“. Nejčastější následek je, že
> se druhý rodič o výletu s příspěvkem dozví od dítěte tři dny předem.
>
> Dvě věci to spraví: oba rodiče v kontaktech u třídního učitele a přístup
> do školního systému pro oba. Škola obojí běžně umožní — jen se o to musí
> někdo přihlásit.

**Út 13. 10. · scéna**

> Napsala mi: „Tak to jsi mi neřekl.“
>
> Měl jsem ten telefon v ruce a našel jsem svoji zprávu. Poslal jsem ji
> před devíti dny, v 23:14, mezi dvěma jinými.
>
> Měl jsem pravdu a nebylo mi to k ničemu. Četla ji unavená, v jedenáct
> večer, mezi dvěma jinými.

**Čt 15. 10. · mikro-návod**

> **Spor o peníze skoro nikdy není o výživném.**
>
> Je o kroužku za osm tisíc, o kterém jeden rodič rozhodl sám.
>
> Nastavte si částku, nad kterou se výdaj domlouvá předem. U většiny rodin
> funguje tisícovka: do ní platí ten, u koho výdaj vznikl, nad ni se to
> domlouvá.

**Ne 18. 10. · rozhovor**

> „Druhý rodič nic nechce používat. Má vůbec smysl si něco zakládat sám?“
>
> Má, a je to častější případ, než se zdá. Spousta rodičů si to pořizuje
> proto, aby v tom měli pořádek sami — vědět, kolik nocí bylo, co se
> zaplatilo a kdy se co domluvilo.
>
> Druhý rodič se někdy přidá za půl roku, když vidí, že to funguje.
> A někdy nikdy. Ani jedno z toho tu první polovinu neznehodnotí.

*Odkaz: `/clanky/ctyri-mesice-po-rozchodu`*

**Út 20. 10. · mikro-návod**

> **Podzimní prázdniny jsou příští týden.**
>
> Dva dny navázané na státní svátek. Přesně proto se na ně zapomíná —
> nikdo je nepovažuje za prázdniny, dokud nepřijde zpráva ze školy.
>
> Nejjednodušší pravidlo: připadnou tomu, kdo má podle rytmu ten týden,
> a nepřepočítává se.

**Čt 22. 10. · scéna**

> Rok jsme se dohadovali, kdo veze na plavání.
>
> Pak jsme to jednou napsali do kalendáře, na který vidíme oba.
>
> Od té doby jsme to neřešili ani jednou. Ne proto, že bychom se usmířili.
> Protože nebylo o čem mluvit.

**Ne 25. 10. · mikro-návod**

> **Začněte řešit Vánoce. Ne v prosinci — teď.**
>
> Kdo to řeší v polovině prosince, řeší to pod tlakem: očekávání
> prarodičů, srovnávání dárků, tři dny, které nejdou rozdělit napůl.
>
> Listopadový rozhovor je o kalendáři. Prosincový je o vině.

**Út 27. 10. · rozhovor**

> „Nevypadá vedení takových záznamů jako sbírání munice proti druhému?“
>
> Rozumím, proč to tak může vypadat. Rozdíl je v tom, že záznam vidí oba
> a vzniká průběžně. Munice se sbírá tajně a vytahuje se zpětně.
>
> Společný kalendář naopak většinu sporů ukončí dřív, než začnou —
> protože není o čem mluvit po paměti.

**Čt 29. 10. · z aplikace**

> Výdaj se dá v Klidoo rozdělit klíčem, na kterém jste se dohodli. Ne
> vždycky napůl — někdy 60/40, u kroužků jinak než u oblečení.
>
> Součet za rok pak není překvapení, ale jen součet.

---

### Listopad — měsíc Vánoc

Celý měsíc jedno téma. Není to přemíra: je to jediné období roku, kdy
tohle publikum opravdu hledá pomoc a kdy má cenu být vidět každý týden.

**Ne 1. 11. · mikro-návod**

> **Nedělte Štědrý den. Střídejte celé Vánoce.**
>
> První nápad bývá rozpůlit 24. prosince: oběd u jednoho, večeře
> u druhého. V praxi je to to nejhorší z obou světů — dítě stráví půl dne
> v autě a obojí zažije napůl.
>
> Co funguje spolehlivěji: letos Štědrý den a Boží hod u jednoho, Silvestr
> a Nový rok u druhého. Příští rok naopak.

*Odkaz: `/clanky/vanoce-ve-stridave-peci`*

**Út 3. 11. · mikro-návod**

> **Zapište si, který rok je „sudý“.**
>
> Věta „letos u mě, příští u tebe“ vydrží přesně do prvního roku, kdy si
> to každý pamatuje jinak.
>
> Sudý rok máma, lichý táta. Nebo naopak. Hlavně ať je to napsané a ať to
> nemusí nikdo odvozovat.

**Čt 5. 11. · scéna**

> Vánoce jsme začali řešit devatenáctého prosince.
>
> Ona brala jako samozřejmé, že Štědrý den bude u ní. Já bral jako
> samozřejmé, že bude napůl.
>
> Ani jeden z nás to nikdy nevyslovil nahlas. Oba jsme si mysleli, že to
> je jasné.

**Ne 8. 11. · mikro-návod**

> **Strop na dárky.**
>
> Ne proto, že by šlo o peníze. Protože dárky jsou nejsnadnější způsob,
> jak si koupit vděčnost — a dítě to pozná dřív než dospělí.
>
> Stačí částka a jedna věta, že velké dárky se domlouvají předem. A pak
> ještě jedna zpráva: kdo co kupuje. Dva stejné dárky ze dvou domácností
> jsou drahý omyl.

**Út 10. 11. · rozhovor**

> „Co je ta jedna věc, která rodinám pomůže nejvíc?“
>
> Přestat si věci pamatovat. Myslím to vážně.
>
> Většina hádek v rodinách se dvěma domovy nevzniká ze zlé vůle, ale ze
> dvou různých vzpomínek na tentýž čtvrtek. Cokoli, co je napsané jednou
> a vidí to oba, ten druh sporu prostě zruší.
>
> Nemusí to být Klidoo. Funguje i sdílený kalendář a jeden dokument. Jenom
> to musí být na jednom místě.

**Čt 12. 11. · mikro-návod**

> **Prarodiče a nová rodina.**
>
> Na Vánoce mívají nárok i lidé, kteří u domlouvání nesedí. Babička, která
> vždycky pekla cukroví. Nový partner, který má taky svoje děti.
>
> Tyhle tlaky se nedají vyřešit rozpisem. Dají se vyřešit tím, že se
> o nich mluví nahlas a předem.

**Ne 15. 11. · scéna**

> Šestiletá se ve školce zeptala paní učitelky, jestli Ježíšek ví, že mají
> dva domovy.
>
> Doma jsme to řešili pátý večer v řadě. Ona to slyšela.

**Út 17. 11. · mikro-návod**

> **Otázka, která zabere líp než „co je spravedlivé“.**
>
> Co si z těch Vánoc odnese dítě?
>
> Odpověď obvykle není „přesně půlka“. Bývá to „nikdo se nehádal a vědělo
> se, co bude“.

**Čt 19. 11. · příběh**

> Modelový příběh o prvních Vánocích ve dvou domovech — a o tom, že jediná
> chyba nebyla v tom, na čem se ti dva domluvili, ale kdy.
>
> Devatenáctého prosince to byl rozhovor o tom, kdo komu co vzal.
> O rok později, čtvrtého listopadu, to byl jeden telefonát.

*Odkaz: `/clanky/prvni-vanoce-ve-dvou-domovech`*

**Ne 22. 11. · mikro-návod**

> **Když se nedomluvíte, je listopad poslední rozumná chvíle na mediátora.**
>
> Tenhle typ sporu se dá odbavit za jedno až dvě sezení. V prosinci na to
> ale mediátoři nemají kapacitu — termíny bývají plné už koncem října.

**Út 24. 11. · mikro-návod**

> **Konkrétní čas a místo předání.**
>
> Ne „někdy odpoledne“. Čtyřiadvacátého prosince odpoledne není doba na
> zjišťování, kde se sejdeme.

**Čt 26. 11. · z aplikace**

> Vánoční týden se dá v kalendáři péče nastavit odchylkou od běžného
> rytmu. Nemusíte kvůli němu měnit celý rozpis a v lednu ho vracet zpátky.

**Ne 29. 11. · scéna**

> „A co budeme dělat příští rok?“
>
> Nejlepší otázka, jakou si můžete na konci Vánoc položit. A jediná doba
> v roce, kdy na ni oba znáte přesnou odpověď.

---

### Prosinec — méně psát, víc být

Nejcitlivější měsíc roku. Lidé nemají kapacitu na návody a všechno, co
zavání prodejem, působí necitlivě. Ubrat na počtu, přidat na přítomnosti
v komentářích.

**Út 1. 12. · mikro-návod**

> **Jestli jste Vánoce ještě neřešili, dnešek je poslední dobrý den.**
>
> Do Štědrého dne zbývají tři týdny. To je pořád dost na rozhovor
> o kalendáři. Za deset dní už to bude rozhovor o něčem jiném.

**Čt 3. 12. · scéna**

> Letos poprvé jsme si napsali, kdo co koupí.
>
> Trvalo to čtyři zprávy a ušetřilo to dvě stejné stavebnice.

**Ne 6. 12. · mikro-návod**

> **Tábory na léto se přihlašují v lednu.**
>
> Zní to absurdně a je to tak. Ty oblíbené bývají plné do konce února
> a jsou to peníze, o kterých se rodiče hádají nejčastěji.
>
> Domluvte se teď, kdo přihlašuje a jak se to platí. V lednu na to nebude
> čas.

**Út 8. 12. · z aplikace**

> Konec roku je dobrá chvíle spočítat tři věci: kolik nocí bylo u koho, co
> se za rok utratilo a kdo to platil.
>
> Ne kvůli vyčítání. Kvůli tomu, aby se o tom příští rok nemuselo
> dohadovat.

*Odkaz: `/clanky/konec-roku-co-spocitat`*

**Čt 10. 12. · scéna**

> Prosinec je jediný měsíc, kdy si rodiče ve dvou domovech přejí, aby bylo
> po Vánocích.
>
> A leden je jediný, kdy si přejí, aby si to byli líp rozmysleli.

**Ne 13. 12. · mikro-návod**

> **Co dělat, když to letos nevyšlo.**
>
> Někdy se to prostě nedomluví a Vánoce budou takové, jaké budou.
>
> Jedna věc, kterou pro dítě můžete udělat i tak: nemluvit o tom před ním.
> Ne proto, že by to nevědělo. Protože pak nemusí mít pocit, že za to může.

**Út 15. 12. · z aplikace**

> Přehled za rok v Klidoo umí vygenerovat souhrn: noci u každého rodiče,
> výdaje po kategoriích, vyrovnání, četnost odvozů.
>
> Dokument uvádí, že jde o záznamy vedené rodinou. Netváří se jako
> posudek, protože jím není.

**Čt 17. 12. · scéna**

> Poslední školní den před prázdninami.
>
> Rodiče, kteří se po předání dítěte na sebe usmáli, budou mít klidnější
> Vánoce než ti, kteří mají lepší rozpis.

**Ne 20. 12. · krátké**

> Ať už to letos vyšlo jakkoli — klidné Vánoce.
>
> A jestli máte Vánoce s dětmi, užijte si je. Jestli letos ne, tak vězte,
> že příští budou.

*Bez odkazu. Tenhle příspěvek nic neprodává a nemá.*

**22. 12. – 1. 1. · ticho**

Nepiš. Odpovídej v komentářích a ve zprávách, pokud přijdou, a nic
nezveřejňuj. Značka, která mezi svátky mlčí, působí líp než značka, která
v nich nabízí předplatné.

## Na co se dívat

Ne na lajky. Na tři čísla, v tomhle pořadí:

1. **Registrace z kanálu `facebook / social`** v `/provoz`.
2. **Uložení a sdílení** příspěvku. Sdílení je jediná metrika, která na
   Facebooku pořád něco znamená — znamená „tohle je natolik pravda, že to
   ukážu ostatním“.
3. Dosah a reakce. Až nakonec, jako diagnostika.

Při téhle velikosti nemá smysl nic A/B testovat. Piš čtyři měsíce, pak se
podívej, které tři příspěvky měly nejvíc sdílení, a piš víc takových.

---

## Články na webu

Sekce `/clanky` běží na **plánovaném vydávání**: text má datum a do toho
dne se nikde neobjeví — ani ve výpisu, ani v mapě webu, a na přímý odkaz
vrátí 404. Je to kalendář, ne archiv.

Sedm textů je napsaných do konce roku. Příspěvek na sítích nesmí
odkazovat na článek, který ještě nevyšel — data jsou v
`src/obsah/clanky/`.

**Modelové příběhy** (`druh: "pribeh"`) mají nad textem natvrdo napsané,
že nejde o záznam skutečného rozhovoru a že jména jsou vymyšlená.
Vykresluje to komponenta podle typu, ne autor při psaní, takže se na to
nedá zapomenout. Vymyšlený rozhovor podaný jako skutečný by u produktu
pro rodiče v rozchodu byl krátkodobý zisk a trvalá škoda.

> Skutečné rozhovory s mediátory by fungovaly líp než modelové příběhy
> a dveře k nim otevírá `docs/oslovovani-mediatoru.md`. Až nějaký
> vznikne, patří na web jako běžný článek — bez označení, protože
> označovat se musí jen to, co se nestalo.

---

## Historie rozhodnutí

| Datum | Co | Proč |
|---|---|---|
| 2026-09-13 | Založen plán, těžiště na Facebook | Tam je publikum; Instagram doplněk, X jen obsazené jméno |
| 2026-09-13 | Sítě vedené jako důvěra a zásoba do skupin, ne jako akvizice | Nástroj na střídavou péči se kupuje ve chvíli problému, a tu sbírá vyhledávání |
| 2026-09-13 | Kalendář příspěvků do konce roku a sedm článků | Listopad patří celý Vánocům, prosinec se ubírá — v nejcitlivějším měsíci působí nabídka necitlivě |
| 2026-09-13 | Pseudo-rozhovory jako označené modelové příběhy | Vymyšlený rozhovor podaný jako skutečný je u produktu stojícího na důvěře trvalá škoda |
