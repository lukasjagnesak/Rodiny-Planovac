/**
 * Adresa školy v EduPage.
 *
 * Do políčka patří jen ta část před `.edupage.org`. Lidé tam ale přirozeně
 * napíšou název školy nebo celý odkaz z prohlížeče — a z „ZŠ Mukařov" pak
 * vznikne `https://ZŠ Mukařov.edupage.org/…`, na což knihovna odpoví
 * anglickou hláškou o neplatné adrese. To je chyba formuláře, ne uživatele.
 */

export interface Vysledek {
  /** Očištěná adresa, nebo `null` když se má škola hledat automaticky. */
  subdomena: string | null;
  /** Vysvětlení pro uživatele, když se z toho adresa udělat nedá. */
  chyba: string | null;
}

const RADA =
  "Sem patří jen část adresy před .edupage.org — třeba zsmukarov " +
  "z https://zsmukarov.edupage.org. Nebo nech pole prázdné a školu " +
  "najdeme podle e-mailu sami.";

export function normalizujSubdomenu(vstup: string | null | undefined): Vysledek {
  const puvodni = (vstup ?? "").trim();

  // Prázdné je v pořádku: přihlášení pak školu hledá samo.
  if (!puvodni) return { subdomena: null, chyba: null };

  // Celý odkaz z prohlížeče je nejčastější a jednoznačný případ.
  let text = puvodni.replace(/^https?:\/\//i, "").split("/")[0];
  text = text.replace(/\.edupage\.org.*$/i, "");

  const ocistene = text.trim().toLowerCase();

  // Mezera nebo diakritika znamená název školy, ne adresu. Hádat by bylo
  // horší než se zeptat: ze špatné adresy vznikne „nesprávné heslo",
  // což pošle člověka hledat úplně jinam.
  if (/\s/.test(ocistene) || /[áčďéěíňóřšťúůýž]/.test(ocistene)) {
    return {
      subdomena: null,
      chyba: `„${puvodni}" vypadá jako název školy, ne jako její adresa. ${RADA}`,
    };
  }

  if (!/^[a-z0-9][a-z0-9-]*$/.test(ocistene)) {
    return {
      subdomena: null,
      chyba: `„${puvodni}" není platná adresa. ${RADA}`,
    };
  }

  return { subdomena: ocistene, chyba: null };
}
