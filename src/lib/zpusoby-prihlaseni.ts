/**
 * Které cizí přihlášení se nabízí.
 *
 * Tlačítko na přihlašovací stránce není slib aplikace, ale slib Supabase:
 * dokud tam poskytovatel není zapnutý, skončí kliknutí hláškou
 * `provider is not enabled` a člověk zůstane přede dveřmi. Přesně to se
 * na klidoo.cz dělo — Google i Apple svítily na přihlašovací stránce,
 * ačkoli ani jeden nebyl nastavený.
 *
 * Tlačítko se proto ukáže jen tomu, kdo poskytovatele opravdu zapnul, a
 * říct si o to musí prostředí. Zapnout se to dá jen z obou stran naráz —
 * v Supabase i v `.env` — takže rozsvícené tlačítko znamená, že za ním
 * něco je.
 *
 * `NEXT_PUBLIC_*` se vpéká do balíčku při sestavení, ne při startu:
 * po změně nestačí restart, musí se přestavět obraz.
 */

/**
 * Bere `1`, `true` i `ano`. Cokoli jiného — včetně prázdné hodnoty,
 * kterou v `.env` nechává ten, kdo řádek jen odkomentoval — znamená
 * vypnuto.
 */
export function zapnuto(hodnota: string | undefined | null): boolean {
  const cista = (hodnota ?? "").trim().toLowerCase();
  return cista === "1" || cista === "true" || cista === "ano";
}

/**
 * Hodnoty se čtou takhle doslova schválně. Sestavovač nahrazuje jen
 * zapsané `process.env.NEXT_PUBLIC_…`; přes proměnnou nebo klíč v poli
 * by v prohlížeči zbylo `undefined` a tlačítka by nešla zapnout nikdy.
 */
export const GOOGLE_ZAPNUTY = zapnuto(process.env.NEXT_PUBLIC_PRIHLASENI_GOOGLE);
export const APPLE_ZAPNUTY = zapnuto(process.env.NEXT_PUBLIC_PRIHLASENI_APPLE);

/** Má se nad formulář vůbec něco kreslit — a s tím i dělicí „nebo“? */
export function jsouCiziPrihlaseni(google = GOOGLE_ZAPNUTY, apple = APPLE_ZAPNUTY): boolean {
  return google || apple;
}
