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

## Prvních pět příspěvků

Připravené k vložení. Formátování je pro Facebook; na Instagram jde
stejný text do popisku, na X se zkrátí na první odstavec.

### 1. Scéna · úterý

> Ve čtvrtek jsem stál před školou a čekal.
>
> Ona taky. O dvě ulice dál, před kroužkem.
>
> Oba jsme si byli jistí. Oba jsme měli pravdu — každý podle jiné SMS
> z jiného týdne.
>
> Tohle nejsou spory. Tohle je provoz. A provoz se nedá vyřešit tím, že
> se oba budeme víc snažit si pamatovat.

*Bez odkazu. První příspěvek, který něco prodává, si lidé zapamatují
špatně.*

### 2. Mikro-návod · čtvrtek

> **Jarní prázdniny nejsou pro celé Česko stejné.**
>
> Rozdělují se po okresech a rozdíl mezi dvěma sousedními může být šest
> týdnů. Když dohoda říká „jarní prázdniny dělíme napůl“, ale děti chodí
> do školy v jiném okrese než kde bydlí jeden z rodičů, je to věta o ničem.
>
> Co pomáhá: napsat do dohody **konkrétní okres**, podle kterého se to
> řídí. Ne „jarní prázdniny“, ale „jarní prázdniny podle okresu, kde dítě
> chodí do školy“.
>
> Zabere to jednu větu a ušetří jednu hádku ročně.

*Odkaz do komentáře: `/jak-funguje-stridava-pece`*

### 3. Z aplikace · neděle

> Nejčastější otázka, kterou dostáváme: **proč počítáte noci, a ne dny?**
>
> Protože den strávíte s dítětem oba. Ráno ho jeden vypraví, odpoledne ho
> druhý vyzvedne. Noc má jen jeden.
>
> Soudy, výživné i selský rozum počítají noci. Tak je počítáme taky —
> a Klidoo je sečte samo, včetně přehozených víkendů a prázdnin.

*Snímek obrazovky s přehledem nocí. Odkaz do komentáře.*

### 4. Mikro-návod · úterý

> **Tři věty, které do dohody patří, a skoro nikdy tam nejsou.**
>
> 1. Kdo dítě předává a kde. Ne „po dohodě“ — konkrétní místo.
> 2. Do kdy se hlásí změna. Třeba 48 hodin, kromě nemoci.
> 3. Kdo platí co nad rámec běžných výdajů a od jaké částky se to
>    domlouvá předem.
>
> Dohoda se nerozbíjí na velkých věcech. Rozbíjí se na tom, že v ní něco
> není a každý si to doplnil jinak.

*Odkaz do komentáře: `/vzor-dohody-o-stridave-peci`*

### 5. Scéna · čtvrtek

> „Mně nikdo nic neřekl.“
>
> Čtyři slova, která v rodině se dvěma domovy zaznějí častěji než
> kterákoli jiná.
>
> A skoro vždycky je to pravda. Někdo to řekl — jen někomu jinému, v jiné
> aplikaci, nebo dítěti, které to zapomnělo.

*Bez odkazu.*

---

## Co dál, podle sezóny

**Říjen** — podzimní prázdniny, první čtvrtletí, třídní schůzky (kdo jde,
kdo předá informace).

**Listopad** — začít o Vánocích. Dva týdny předem je pozdě; kdo to řeší
v prosinci, řeší to v hádce. Téma: jak se dělí Štědrý den, proč střídání
po letech funguje líp než dělení jednoho dne na půl, co s dárky ze dvou
domácností.

**Prosinec** — málo obsahu, hodně přítomnosti v komentářích. Nejvytíženější
a nejcitlivější měsíc v roce.

**Leden** — pololetní vysvědčení, nový rozvrh, tábory na léto (přihlášky
běží od ledna a jsou to peníze, o kterých se rodiče hádají).

---

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

## Historie rozhodnutí

| Datum | Co | Proč |
|---|---|---|
| 2026-09-13 | Založen plán, těžiště na Facebook | Tam je publikum; Instagram doplněk, X jen obsazené jméno |
| 2026-09-13 | Sítě vedené jako důvěra a zásoba do skupin, ne jako akvizice | Nástroj na střídavou péči se kupuje ve chvíli problému, a tu sbírá vyhledávání |
