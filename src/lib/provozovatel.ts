/**
 * Údaje o provozovateli pro zásady ochrany osobních údajů a obchodní
 * podmínky. Ověřeno v ARES podle IČO.
 */
export const PROVOZOVATEL = {
  /** Obchodní firma nebo jméno podnikatele. */
  nazev: "Šárka Jagnešáková",
  /** IČO. */
  ico: "11875003",
  /** Sídlo. */
  adresa: "Theinova 996/4, Čakovice, 196 00 Praha 9",
  /** E-mail pro uplatnění práv subjektu údajů. */
  email: "info@klidoo.cz",
  /**
   * Neplátce DPH. Ceny jsou konečné a na dokladech nesmí být vyčíslená
   * daň — přiznat ji a odvést by pak byla povinnost i bez registrace.
   */
  platceDph: false,
  /** Zapsán v živnostenském rejstříku. */
  zapis: "Zapsána v živnostenském rejstříku vedeném Úřadem městské části Praha 18.",
} as const;

/** `true`, když jsou vyplněné povinné identifikační údaje. */
export function maIdentifikaci(): boolean {
  return Boolean(PROVOZOVATEL.nazev && PROVOZOVATEL.ico && PROVOZOVATEL.adresa);
}
