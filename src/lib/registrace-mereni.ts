/**
 * Aby se jedna registrace nezapočítala dvakrát.
 *
 * Registrace může vzniknout dvěma cestami a každá o sobě ví jinak:
 *
 *  - formulářem — víme o ní přesně v okamžiku odeslání,
 *  - přes Google — prohlížeč v tu chvíli odchází na účty Googlu
 *    a vrací se až na `/vitejte`, takže v samotném formuláři není
 *    čeho se chytit.
 *
 * Druhá cesta se proto měří až na `/vitejte`. Kdyby se tam měřila
 * bez rozmyslu, každý, kdo se zaregistruje formulářem a projde dál,
 * by Googlu poslal konverzi dvakrát — a podle dvojnásobného počtu
 * registrací by se pak nastavovaly příhozy.
 *
 * Značka je vázaná na ID uživatele, ne na prohlížeč: dvě registrace
 * ze stejného počítače jsou dvě konverze, a to správně.
 */

const PREDPONA = "klidoo-registrace-";

/**
 * Zapíše, že tahle registrace už je nahlášená.
 * `true` znamená „nahlas ji", `false` „už se stalo".
 *
 * Bez `userId` se hlásí vždycky — radši o jednu konverzi víc než
 * o celou cestu přijít.
 */
export function zapisRegistraci(userId: string | null): boolean {
  if (!userId) return true;
  if (typeof window === "undefined") return false;

  try {
    const klic = PREDPONA + userId;
    if (window.localStorage.getItem(klic)) return false;
    window.localStorage.setItem(klic, String(Date.now()));
    return true;
  } catch {
    // Zakázané úložiště. Měřit je pořád lepší než neměřit.
    return true;
  }
}
