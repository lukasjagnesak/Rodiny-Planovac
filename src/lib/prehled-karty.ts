/**
 * Které karty přehledu rodič vidí a v jakém pořadí.
 *
 * Rozvržení je osobní, ne rodinné — každý rodič se dívá na něco jiného.
 * Jeden potřebuje vědět, kdy končí škola, druhého zajímají peníze a
 * kalendář má stejně na zdi. Uloženo je proto u profilu, ne u rodiny.
 *
 * Uložený tvar je pole řetězců v pořadí, ve kterém se karty kreslí.
 * Vypnutá karta je v poli taky, jen s pomlčkou na začátku (`-vydaje`).
 * Díky tomu jde poznat rozdíl mezi „tuhle kartu rodič vypnul" a „tahle
 * karta v době ukládání ještě neexistovala" — nová karta se objeví,
 * kdežto vypnutá zůstane vypnutá.
 */

export type KartaId =
  | "dnes"
  | "skola"
  | "cisla"
  | "noci"
  | "krouzky"
  | "udalosti"
  | "ukoly"
  | "vydaje";

export interface KartaPopis {
  id: KartaId;
  nazev: string;
  popis: string;
  /**
   * Jak široká karta na velké obrazovce je. `pul` se na šířce od `lg`
   * páruje se sousední půlkartou, `plna` zabírá celý řádek.
   */
  sirka: "plna" | "pul";
}

/**
 * Všechny karty ve výchozím pořadí.
 *
 * Pořadí tady je zároveň to, co uvidí rodič, který si nic nepřenastavil,
 * a kam se zařadí karta, kterou přidá až budoucí verze.
 */
export const KARTY: KartaPopis[] = [
  {
    id: "dnes",
    nazev: "Dnes u koho",
    popis: "U koho děti dnes spí a kdy je předání",
    sirka: "plna",
  },
  {
    id: "skola",
    nazev: "Dnes končí",
    popis: "V kolik dnes každému dítěti končí vyučování",
    sirka: "plna",
  },
  {
    id: "cisla",
    nazev: "Klíčová čísla",
    popis: "Útrata za měsíc a poměr nocí",
    sirka: "plna",
  },
  {
    id: "noci",
    nazev: "Čas s dětmi",
    popis: "Rozdělení nocí — tento měsíc a celý rok",
    sirka: "plna",
  },
  {
    id: "krouzky",
    nazev: "Kdo veze",
    popis: "Nejbližší kroužky a kdo na ně veze",
    sirka: "pul",
  },
  {
    id: "udalosti",
    nazev: "Co nás čeká",
    popis: "Škola, lékař a výlety",
    sirka: "pul",
  },
  {
    id: "ukoly",
    nazev: "Úkoly a písemky",
    popis: "Co je ze školy potřeba stihnout (vyžaduje EduPage)",
    sirka: "pul",
  },
  {
    id: "vydaje",
    nazev: "Útrata podle dětí",
    popis: "Kolik za tenhle měsíc padlo na které dítě",
    sirka: "plna",
  },
];

const PODLE_ID = new Map(KARTY.map((k) => [k.id, k]));

export interface KartaVolba {
  id: KartaId;
  nazev: string;
  popis: string;
  sirka: "plna" | "pul";
  zapnuta: boolean;
}

function jakoVolba(karta: KartaPopis, zapnuta: boolean): KartaVolba {
  return { ...karta, zapnuta };
}

/**
 * Uložené nastavení převede na seznam karet k vykreslení.
 *
 * Snese i nesmysl: neznámé jméno karty se zahodí (kartu mohla odstranit
 * novější verze), zdvojené se počítá jednou a prázdné nastavení znamená
 * výchozí rozvržení. Karta, o které uložené nastavení neví, se přidá na
 * konec zapnutá — nová věc v aplikaci by neměla zůstat schovaná.
 */
export function serazeneKarty(ulozene: string[] | null | undefined): KartaVolba[] {
  if (!ulozene || ulozene.length === 0) return KARTY.map((k) => jakoVolba(k, true));

  const vysledek: KartaVolba[] = [];
  const videno = new Set<KartaId>();

  for (const zaznam of ulozene) {
    const zapnuta = !zaznam.startsWith("-");
    const id = (zapnuta ? zaznam : zaznam.slice(1)) as KartaId;
    const karta = PODLE_ID.get(id);
    if (!karta || videno.has(id)) continue;
    videno.add(id);
    vysledek.push(jakoVolba(karta, zapnuta));
  }

  for (const karta of KARTY) {
    if (!videno.has(karta.id)) vysledek.push(jakoVolba(karta, true));
  }

  return vysledek;
}

/** Opačný směr — seznam karet do tvaru, který jde uložit do databáze. */
export function ulozitelnyTvar(volby: KartaVolba[]): string[] {
  return volby.map((v) => (v.zapnuta ? v.id : `-${v.id}`));
}

/** Jen zapnuté karty, v pořadí — tohle kreslí přehled. */
export function zapnuteKarty(ulozene: string[] | null | undefined): KartaVolba[] {
  return serazeneKarty(ulozene).filter((k) => k.zapnuta);
}

/**
 * Posune kartu o jedno místo nahoru nebo dolů.
 *
 * Posouvá se přes vypnuté karty taky, protože v nastavení jsou vidět —
 * kdyby je přeskakovala, poskočila by karta zdánlivě o dvě místa.
 */
export function posun(volby: KartaVolba[], id: KartaId, smer: -1 | 1): KartaVolba[] {
  const odkud = volby.findIndex((v) => v.id === id);
  const kam = odkud + smer;
  if (odkud === -1 || kam < 0 || kam >= volby.length) return volby;

  const kopie = [...volby];
  [kopie[odkud], kopie[kam]] = [kopie[kam], kopie[odkud]];
  return kopie;
}

/** Zapne nebo vypne kartu, pořadí zůstává. */
export function prepni(volby: KartaVolba[], id: KartaId): KartaVolba[] {
  return volby.map((v) => (v.id === id ? { ...v, zapnuta: !v.zapnuta } : v));
}

/** Je rozvržení jiné než výchozí? Podle toho se ukazuje „Obnovit výchozí". */
export function jeUpravene(volby: KartaVolba[]): boolean {
  if (volby.length !== KARTY.length) return true;
  return volby.some((v, i) => v.id !== KARTY[i].id || !v.zapnuta);
}
