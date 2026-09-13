/**
 * Obsah checklistu prvních 30 dní.
 *
 * Jedno místo pro stránku i pro soubor ke stažení — kdyby to bylo dvakrát,
 * rozejde se to hned při první úpravě a lidem přijde něco jiného, než co
 * si přečetli na webu.
 */

export interface SekceChecklistu {
  nadpis: string;
  body: string[];
}

export const CHECKLIST_TITULEK = "Checklist prvních 30 dní ve střídavé péči";

export const CHECKLIST_UVOD =
  "Věci, které je potřeba zařídit hned na začátku. Ne proto, že hoří, ale " +
  "proto, že se na ně zapomene a za půl roku z nich je spor.";

export const CHECKLIST_PATA =
  "Klidoo — kalendář, kroužky a výdaje pro rodiny, které žijí ve dvou " +
  "domácnostech. klidoo.cz. Tento materiál je informativní a nenahrazuje " +
  "právní poradenství.";

export const SEKCE: SekceChecklistu[] = [
  {
    nadpis: "Škola a školka",
    body: [
      "Nahlásit oba rodiče jako kontaktní osoby — telefon i e-mail, oběma.",
      "Zařídit, aby zprávy z EduPage nebo Bakalářů chodily oběma rodičům.",
      "Domluvit se školou, kdo smí dítě vyzvednout a kdo omlouvá absenci.",
      "Předat rozpis střídání třídnímu učiteli, ať ví, komu psát který týden.",
      "Projít kroužky: kdo vozí, kdo vyzvedává, kdo platí pololetí.",
    ],
  },
  {
    nadpis: "Zdraví",
    body: [
      "Kartička pojištěnce: rozhodnout, jestli putuje s dítětem, nebo bude kopie v obou domácnostech.",
      "Nahlásit u pediatra oba rodiče a jejich telefony.",
      "Sepsat léky, alergie a dávkování — a mít to dostupné z obou domovů.",
      "Domluvit, kdo objednává k lékaři a jak se to druhý rodič dozví.",
    ],
  },
  {
    nadpis: "Doklady a úřady",
    body: [
      "Dohodnout trvalé bydliště dítěte a písemně to potvrdit.",
      "Rozhodnout, kdo drží pas a průkaz, a jak se předává před cestou.",
      "Nahlásit změnu adresy tam, kde je potřeba (pojišťovna, škola, lékař).",
    ],
  },
  {
    nadpis: "Peníze",
    body: [
      "Domluvit, kdo pobírá přídavek na dítě.",
      "Domluvit, kdo uplatňuje daňové zvýhodnění — a v kterých měsících.",
      "Dohodnout klíč na mimořádné výdaje: lyžák, tábor, rovnátka, kroužky.",
      "Založit jedno místo, kam se zapisují společné výdaje. Cokoli, jen ať je jedno.",
    ],
  },
  {
    nadpis: "Provoz",
    body: [
      "Sepsat, co se zdvojí (pyžamo, kartáček, nabíječka) a co putuje s dítětem.",
      "Určit místo a čas předávky a napsat to tak, aby to bylo jednoznačné.",
      "Dohodnout, do kdy se žádá o výměnu termínu a co znamená mlčení druhého rodiče.",
    ],
  },
];
