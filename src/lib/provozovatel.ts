/**
 * Údaje o provozovateli pro zásady ochrany osobních údajů a obchodní
 * podmínky.
 *
 * DOPLNIT PŘED SPUŠTĚNÍM: bez identifikace správce údajů nejsou zásady
 * podle GDPR úplné. Až budou vyplněné, stránka je vypíše sama.
 */
export const PROVOZOVATEL = {
  /** Obchodní firma nebo jméno podnikatele. */
  nazev: "",
  /** IČO. */
  ico: "",
  /** Sídlo. */
  adresa: "",
  /** E-mail pro uplatnění práv subjektu údajů. */
  email: "info@klidoo.cz",
} as const;

/** `true`, když jsou vyplněné povinné identifikační údaje. */
export function maIdentifikaci(): boolean {
  return Boolean(PROVOZOVATEL.nazev && PROVOZOVATEL.ico && PROVOZOVATEL.adresa);
}
