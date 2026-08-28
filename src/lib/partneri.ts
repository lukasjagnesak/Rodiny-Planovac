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
