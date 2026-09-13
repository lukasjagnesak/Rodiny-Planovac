import type { Clanek } from "../../lib/clanky-typy";

export const penize: Clanek = {
  slug: "rozhovor-o-penezich-ve-dvou-domovech",
  titul: "Rozhovor s rodinou: o penězích",
  perex:
    "Modelový rozhovor. Ptali jsme se rodičů, kteří nemají péči rozdělenou napůl, kdo u nich co platí a jak se na tom domluvili.",
  datum: "2026-10-14",
  druh: "pribeh",
  bloky: [
    {
      typ: "odstavec",
      text: "Markéta a David, dcera deset let. Dcera je u Davida každý druhý víkend a jeden všední večer; v nocích to vychází zhruba 70 ku 30.",
    },
    { typ: "otazka", text: "Jak jste se dostali k tomuhle rozdělení?" },
    {
      typ: "odpoved",
      kdo: "David",
      text: "Dělám na směny a bydlím čtyřicet minut od školy. Kdybych ji měl týden, vozil by ji tam třikrát týdně někdo jiný.",
    },
    {
      typ: "odpoved",
      kdo: "Markéta",
      text: "Chtěli jsme oba víc. Prostě to nešlo.",
    },
    { typ: "otazka", text: "Řeší to okolí?" },
    {
      typ: "odpoved",
      kdo: "Markéta",
      text: "Když někde řeknu, jak to máme, mám pocit, že se musím obhajovat. Buď jsem mu bránila, nebo on nechtěl. Ani jedno není pravda.",
    },
    { typ: "odpoved", kdo: "David", text: "Mě se nikdo neptá." },
    { typ: "otazka", text: "Jak máte nastavené výživné?" },
    {
      typ: "odpoved",
      kdo: "David",
      text: "Podle rozhodnutí soudu. To chodí, to nikdy nebyl problém.",
    },
    { typ: "otazka", text: "Co tedy problém byl?" },
    {
      typ: "odpoved",
      kdo: "Markéta",
      text: "Všechno kolem. Boty, brýle, lyžák, kroužky, školní fotky. Platila jsem to já, protože to bylo u mě a bylo to rychlejší, než se ptát.",
    },
    { typ: "otazka", text: "Jak dlouho to tak bylo?" },
    { typ: "odpoved", kdo: "Markéta", text: "Rok. Možná víc." },
    {
      typ: "odpoved",
      kdo: "David",
      text: "Netušil jsem, kolik toho je. To říkám na svou obhajobu i na svou hanbu.",
    },
    { typ: "otazka", text: "Jak se to změnilo?" },
    {
      typ: "odpoved",
      kdo: "Markéta",
      text: "Začala jsem si to psát. Ne kvůli němu — chtěla jsem vědět, jestli mám pocit, nebo pravdu.",
    },
    { typ: "otazka", text: "A co to bylo?" },
    { typ: "odpoved", kdo: "Markéta", text: "Obojí." },
    { typ: "otazka", text: "Jak reagoval, když jste mu to ukázala?" },
    {
      typ: "odpoved",
      kdo: "David",
      text: "Nejdřív jsem se zeptal, jestli mě kontroluje. To byla blbá otázka.",
    },
    {
      typ: "odpoved",
      kdo: "Markéta",
      text: "Řekla jsem, že to vidí taky a že to nevzniklo zpětně. To ho uklidnilo.",
    },
    {
      typ: "odpoved",
      kdo: "David",
      text: "Spíš mě vyděsilo to číslo. Nikdy jsem to neviděl pohromadě.",
    },
    { typ: "otazka", text: "Změnilo se něco?" },
    {
      typ: "odpoved",
      kdo: "David",
      text: "Vzal jsem si kroužky a lyžák. Poměr nocí zůstal, ten neměníme.",
    },
    { typ: "otazka", text: "Máte na to nějaké pravidlo?" },
    {
      typ: "odpoved",
      kdo: "Markéta",
      text: "Do tisícovky platí ten, u koho to vzniklo. Nad tisícovku se ptáme předem.",
    },
    {
      typ: "odpoved",
      kdo: "David",
      text: "To pravidlo si pamatuju líp než ona. Ona se ptá i u pětistovky.",
    },
    { typ: "otazka", text: "Funguje to?" },
    { typ: "odpoved", kdo: "Markéta", text: "Většinou." },
    {
      typ: "odpoved",
      kdo: "David",
      text: "U tábora ne. Ten stojí jedenáct tisíc a to se pokaždé řeší znovu.",
    },
  ],
  dalsi: [
    { text: "Co patří do dohody", odkaz: "/clanky/co-patri-do-dohody-o-stridave-peci" },
    { text: "Konec roku: co spočítat", odkaz: "/clanky/konec-roku-co-spocitat" },
  ],
};
