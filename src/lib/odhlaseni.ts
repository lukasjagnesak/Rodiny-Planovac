/**
 * Odhlášení z e-mailů, které nejsou provozní.
 *
 * Odkaz na odhlášení musí být v každé takové zprávě a musí fungovat bez
 * přihlášení — člověk, který si stáhl vzor dohody, žádný účet nemá.
 * Zároveň nesmí jít odhlásit cizí adresu, jinak stačí znát e-mail
 * a příjemce odstřihnout.
 *
 * Řeší to podpis: v odkazu je adresa a otisk spočítaný ze serverového
 * tajemství. Bez tajemství se otisk nedá vyrobit, takže odkaz platí jen
 * pro tu jednu adresu — a nic se kvůli tomu nemusí ukládat dopředu.
 * Token bez expirace je tu záměr: odhlašovací odkaz ve dva roky staré
 * zprávě musí fungovat pořád.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

function tajemstvi(): string {
  // Stejná dvojice jako u anonymního otisku návštěvníka v `provoz.ts`.
  const sul = process.env.PROVOZ_SUL || process.env.CRON_SECRET;
  if (!sul) throw new Error("Chybí PROVOZ_SUL ani CRON_SECRET — odhlašovací odkaz nejde podepsat.");
  return sul;
}

/** Adresa se všude porovnává v téhle podobě. */
export function normalizuj(email: string): string {
  return email.trim().toLowerCase();
}

/** Otisk adresy. Krátký schválně — odkaz se čte i z textové verze zprávy. */
export function podpis(email: string): string {
  return createHmac("sha256", tajemstvi())
    .update(normalizuj(email))
    .digest("base64url")
    .slice(0, 24);
}

/**
 * Porovnání odolné vůči měření času.
 *
 * Přehnaná opatrnost u odhlašovacího odkazu? Stojí to jeden řádek
 * a alternativa je postranní kanál, kterým jde otisk uhodnout znak
 * po znaku.
 */
export function podpisSedi(email: string, otisk: string): boolean {
  const ocekavany = Buffer.from(podpis(email));
  const dodany = Buffer.from(otisk);
  if (ocekavany.length !== dodany.length) return false;
  return timingSafeEqual(ocekavany, dodany);
}

/** Hotový odkaz do zprávy. */
export function odhlasovaciOdkaz(web: string, email: string): string {
  const parametry = new URLSearchParams({ e: normalizuj(email), t: podpis(email) });
  return `${web}/odhlasit?${parametry.toString()}`;
}
