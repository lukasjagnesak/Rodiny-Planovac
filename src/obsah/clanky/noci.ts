import type { Clanek } from "../../lib/clanky-typy";

export const noci: Clanek = {
  slug: "jak-se-pocitaji-noci-ve-stridave-peci",
  titul: "Proč se ve střídavé péči počítají noci, a ne dny",
  perex:
    "Den strávíte s dítětem oba — jeden ho ráno vypraví, druhý odpoledne vyzvedne. Noc má jen jeden. Na tom stojí výpočty, o které se rodiče hádají nejčastěji.",
  datum: "2026-09-13",
  druh: "clanek",
  bloky: [
    {
      typ: "odstavec",
      text: "Kolik má dítě dní u koho? Zní to jako otázka s jednoduchou odpovědí a je to nejčastější zdroj nedorozumění, na který u rodin narážíme. Dva rodiče spočítají tentýž měsíc a každý vyjde jinak — přitom ani jeden nepodvádí.",
    },
    {
      typ: "odstavec",
      text: "Problém je v tom, že **den se dá započítat oběma**. Ve čtvrtek vypravíte dítě do školy vy, odpoledne si ho vyzvedne druhý rodič. Čí to byl den? Váš, protože jste ho budili a dělali snídani. A jeho, protože s ním dělal úkoly a vařil večeři. Oba máte pravdu a součet přesahuje sto procent.",
    },
    { typ: "nadpis", text: "Noc jde přiřadit jednoznačně" },
    {
      typ: "odstavec",
      text: "Noc má jen jeden rodič. Tu nejde rozdělit, zdvojit ani vyložit dvojím způsobem. Proto se ve střídavé péči — u nás i jinde — počítají **noci, ne dny**. Je to jediná jednotka, na které se dá shodnout bez dohadování o tom, co se počítá jako „mít dítě u sebe“.",
    },
    {
      typ: "poznamka",
      text: "Praktické pravidlo: noc patří tomu, u koho dítě usíná. Ne tomu, kdo ho ráno vyzvedne.",
    },
    { typ: "nadpis", text: "Kde na tom záleží v praxi" },
    {
      typ: "seznam",
      polozky: [
        "**Výživné.** Poměr péče je jedním ze vstupů, se kterými se počítá. Rozdíl mezi 40 a 50 procenty nocí není kosmetický.",
        "**Daňové zvýhodnění a přídavky.** Rozhoduje, u koho má dítě bydliště a jak je péče nastavená, ne dojem o tom, kdo se stará víc.",
        "**Dohoda a její plnění.** Když se v dohodě píše „střídání po týdnu“ a rok se nepozorovaně vychýlí, je to obvykle vidět právě na nocích.",
        "**Vlastní klid.** Většina rodičů, kteří si noci poprvé spočítají, zjistí, že to sedí líp, než si mysleli. Pocit křivdy bývá o dojmu, ne o číslech.",
      ],
    },
    { typ: "nadpis", text: "Kde se výpočet nejčastěji rozjede" },
    {
      typ: "odstavec",
      text: "Střídání po týdnu vypadá jako přesná půlka. Ve skutečnosti se skoro nikdy nevyjde na padesát procent, a to ze tří důvodů.",
    },
    {
      typ: "cislovany",
      polozky: [
        "**Prázdniny a svátky** se řídí jinak než běžný rytmus a bývají delší u toho, kdo má zrovna dovolenou.",
        "**Přehozené víkendy.** Jedna výměna kvůli svatbě nebo služební cestě se nevrátí sama; po roce je z toho pět nocí rozdílu.",
        "**Nemoci.** Dítě zůstane u toho, kdo si zrovna může vzít volno. Nikdo to nepočítá a nikdo to nevrací.",
      ],
    },
    {
      typ: "odstavec",
      text: "Žádná z těch věcí není problém sama o sobě. Problém nastane, když se o nich po roce začne mluvit zpětně a každý si pamatuje jiná čísla.",
    },
    { typ: "nadpis", text: "Co s tím" },
    {
      typ: "odstavec",
      text: "Nejlevnější řešení je psát to průběžně. Ne kvůli kontrole druhého rodiče — kvůli tomu, aby se o tom nemuselo hádat. Když je rozpis na jednom místě a vidí ho oba, přehozený víkend je poznámka, ne budoucí spor.",
    },
    {
      typ: "odstavec",
      text: "V Klidoo se noci sečtou samy, včetně výměn a prázdnin, a stejné číslo vidí oba rodiče. Kdo si to chce jen spočítat, může použít **kalkulačku péče** — funguje bez registrace.",
    },
  ],
  dalsi: [
    { text: "Kalkulačka střídavé péče", odkaz: "/kalkulacka" },
    { text: "Jak funguje střídavá péče", odkaz: "/jak-funguje-stridava-pece" },
  ],
};
