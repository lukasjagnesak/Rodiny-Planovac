/**
 * Podmínky partnerských programů na jednom místě.
 *
 * Čísla se budou hýbat podle toho, jak se usadí ceník. Když jsou tady,
 * je změna jedna úprava souboru, a ne hledání po marketingových stránkách —
 * kde by se navíc dřív nebo později rozešla.
 */

/** Podíl z předplatného, které doporučená rodina zaplatí v prvním roce. */
export const PROVIZE_PROCENTO = 25;

/** Jak dlouho se doporučení počítá od prvního prokliku. */
export const PLATNOST_DOPORUCENI_DNI = 90;

/** Provize se vyplácejí čtvrtletně, aby to nebyla administrativa za pár korun. */
export const VYPLATA_OBDOBI = "čtvrtletně";

/** Minimální částka k výplatě. Pod ní se provize převádí do dalšího období. */
export const MINIMALNI_VYPLATA_KC = 1000;

/** Kontakt pro partnery. */
export const PARTNERSKY_EMAIL = "partneri@klidoo.cz";


/**
 * Součty pro partnerský portál.
 *
 * Zásadní je, co tu NENÍ: jména rodin, jejich kalendáře ani jednotlivé
 * částky. Partner dostane svoje obchodní čísla, ne data rodin — ta mu
 * nepřísluší už proto, že mediace stojí na mlčenlivosti. Rodinný detail
 * si rodina vygeneruje sama v souhrnu a dá mu ho, když chce.
 */
export interface PrehledPartnera {
  rodinCelkem: number;
  veZkusebnim: number;
  platicich: number;
  zrusenych: number;
  /** Kolik doporučené rodiny dohromady zaplatily. */
  zaklad: number;
  /** Provize z toho. */
  provize: number;
  /** Chybí do nejnižší výplaty; 0 = dá se vyplatit. */
  doVyplaty: number;
}

/** Stav předplatného doporučené rodiny, jak ho vidí `predplatna.stav`. */
export type StavRodiny = "zkusebni" | "aktivni" | "po_splatnosti" | "zruseno" | string;

/**
 * Spočítá přehled.
 *
 * Čistá funkce, protože je to jediné místo v aplikaci, kde se počítají
 * cizí peníze. Provize spočítaná o dvě stě korun jinak, než co partner
 * čeká, je horší než žádný portál — je to spor s někým, kdo posílá
 * klienty.
 *
 * Základ jsou skutečně zaplacené faktury, ne ceník. Rodina může platit
 * měsíčně, ročně, přejít z jednoho na druhé nebo dostat slevu; odhad
 * z ceníku by se rozešel hned u prvního takového případu.
 */
export function slozPrehled(vstup: {
  stavy: StavRodiny[];
  zaplaceno: number[];
  provizeProcento?: number;
  minimalniVyplata?: number;
}): PrehledPartnera {
  const procento = vstup.provizeProcento ?? PROVIZE_PROCENTO;
  const minimum = vstup.minimalniVyplata ?? MINIMALNI_VYPLATA_KC;

  const zaklad = vstup.zaplaceno.reduce((s, c) => s + c, 0);
  // Na celé koruny dolů: vyplatit se má to, co je jisté.
  const provize = Math.floor((zaklad * procento) / 100);

  return {
    rodinCelkem: vstup.stavy.length,
    veZkusebnim: vstup.stavy.filter((s) => s === "zkusebni").length,
    platicich: vstup.stavy.filter((s) => s === "aktivni" || s === "po_splatnosti").length,
    zrusenych: vstup.stavy.filter((s) => s === "zruseno").length,
    zaklad,
    provize,
    doVyplaty: Math.max(0, minimum - provize),
  };
}

/**
 * Návrh kódu do odkazu.
 *
 * Přepisuje se z vizitky a diktuje po telefonu, takže bez diakritiky
 * a bez znaků, které si někdo splete. Jednoznačnost se řeší až při
 * zápisu do databáze — tohle je jen návrh.
 */
export function navrhKodu(jmeno: string): string {
  return jmeno
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}
