/**
 * Články a příběhy na webu.
 *
 * Obsah je v datech, ne v markdownu: projekt nemá žádnou knihovnu na
 * jeho vykreslení a přidávat ji kvůli šesti textům by znamenalo tahat
 * si do sestavení parser, sanitizaci a starost o bezpečnost. Bloky jsou
 * navíc kontrolované typem, takže překlep v nadpisu shodí `tsc`, ne až
 * stránku.
 */

export type Blok =
  | { typ: "odstavec"; text: string }
  | { typ: "nadpis"; text: string }
  | { typ: "seznam"; polozky: string[] }
  | { typ: "cislovany"; polozky: string[] }
  | { typ: "citace"; text: string; kdo?: string }
  /** Otázka a odpověď v příbězích psaných jako rozhovor. */
  | { typ: "otazka"; text: string }
  | { typ: "odpoved"; text: string }
  /** Vyčnívající rámeček — praktická poznámka, ne ozdoba. */
  | { typ: "poznamka"; text: string };

/**
 * Druh textu.
 *
 * `pribeh` není jen jiné vykreslení. Je to slib čtenáři: u takového
 * textu se **vždycky** vypíše, že je modelový a že jméno je vymyšlené.
 * Vykresluje to komponenta podle tohohle pole, takže se na to nedá
 * zapomenout — a to je celý důvod, proč to není obyčejný článek
 * s odstavcem navíc někde na konci.
 *
 * Vymyšlený rozhovor podaný jako skutečný by u produktu, který stojí na
 * důvěře rodičů, byl krátkodobý zisk a trvalá škoda.
 */
export type DruhTextu = "clanek" | "pribeh";

export interface Clanek {
  slug: string;
  titul: string;
  /** Věta do výpisu a do popisku pro vyhledávače. */
  perex: string;
  /** ISO datum vydání. Řadí výpis a ukazuje se u textu. */
  datum: string;
  druh: DruhTextu;
  /** Odhad čtení v minutách. Počítá se, nepíše se ručně. */
  bloky: Blok[];
  /** Kam poslat čtenáře dál. Nepovinné. */
  dalsi?: { text: string; odkaz: string }[];
}

/** Průměrné tempo čtení v češtině na mobilu, střízlivě dolů. */
const SLOV_ZA_MINUTU = 180;

export function dobaCteni(clanek: Clanek): number {
  const slov = clanek.bloky.reduce((soucet, blok) => {
    const text =
      blok.typ === "seznam" || blok.typ === "cislovany"
        ? blok.polozky.join(" ")
        : blok.text;
    return soucet + text.split(/\s+/).filter(Boolean).length;
  }, 0);

  return Math.max(1, Math.round(slov / SLOV_ZA_MINUTU));
}

/**
 * Tučný text uvnitř odstavce.
 *
 * Jediná značka, kterou texty potřebují. Vrací kusy, ne HTML — nic se
 * nikam nevkládá přes `dangerouslySetInnerHTML` a nemůže se tím tedy
 * nic rozbít ani propašovat.
 */
export function rozlozTucne(text: string): { text: string; tucne: boolean }[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((kus) => kus !== "")
    .map((kus) =>
      kus.startsWith("**") && kus.endsWith("**")
        ? { text: kus.slice(2, -2), tucne: true }
        : { text: kus, tucne: false },
    );
}
