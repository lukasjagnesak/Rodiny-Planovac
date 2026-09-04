/**
 * Rozpad stahování z EduPage po dětech.
 *
 * Bydlí zvlášť od `edupage-sync.ts`, protože to je čistý výpočet bez
 * Supabase a bez `server-only` — jde tak otestovat samostatně.
 */

/** Co se stáhlo pro jedno spárované dítě. */
export interface SouhrnDitete {
  jmeno: string;
  /** Kolik událostí vrátila timeline toho dítěte. */
  udalosti: number;
  /** Kolik z nich se uložilo právě jemu. */
  ulozeno: number;
  /** Vyplněné, když stahování u toho dítěte selhalo. */
  chyba?: string;
}

/**
 * Z rozpadu po dětech udělá varování, která má rodič vidět.
 *
 * Spárované dítě, kterému nepřišlo nic, je skoro vždycky chyba —
 * přepnutí účtu neprošlo, párování ukazuje na cizí ID, nebo škola
 * u toho dítěte nic nesdílí. Dokud se to nikde nenapsalo, vypadalo
 * takové stažení navenek stejně jako povedené a rodina se dvěma dětmi
 * viděla data jen k jednomu z nich.
 *
 * U jednoho spárovaného dítěte se nehlásí nic: prázdno tam může být
 * prostě klidný týden a není s čím srovnávat. Dítě, u kterého stahování
 * spadlo, se taky přeskakuje — chybu už hlásí služba sama a druhá
 * hláška o téže věci nikomu nepomůže.
 */
export function varovaniZeSouhrnu(souhrn: SouhrnDitete[]): string[] {
  if (souhrn.length < 2) return [];

  const prazdna = souhrn.filter((s) => s.udalosti === 0 && !s.chyba);
  if (prazdna.length === 0) return [];

  if (prazdna.length === souhrn.length) {
    return ["Z EduPage nepřišlo nic k žádnému dítěti."];
  }

  return [
    `Nepřišlo nic k dítěti: ${prazdna.map((s) => s.jmeno).join(", ")}. ` +
      "Zkontroluj párování v Nastavení → EduPage.",
  ];
}
