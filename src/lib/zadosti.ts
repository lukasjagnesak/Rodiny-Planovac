/**
 * Žádosti o změnu rozvrhu — pravidla bez databáze, ať jdou otestovat.
 *
 * Kdo co smí, rozhoduje databáze (migrace 0032). Tady je jen to, co
 * potřebuje obrazovka: jestli se má místo přímé úpravy ukázat návrh,
 * jak napsat rozsah dnů a jaký termín odpovědi předvyplnit.
 */
import type { MemberView } from "./types";

/**
 * Má rodina dva rodiče? Stejná podmínka jako `ma_dva_rodice` v databázi:
 * dva různí členové se stranou péče a rolí owner nebo parent.
 */
export function maDvaRodice(members: Pick<MemberView, "userId" | "side" | "role">[]): boolean {
  const rodice = new Set(
    members
      .filter((m) => m.side !== null && (m.role === "owner" || m.role === "parent"))
      .map((m) => m.userId),
  );
  return rodice.size >= 2;
}

/** „6. 11." nebo „6. 11.–8. 11." — stejně jako zprávy, které píše databáze. */
export function rozsahDnu(od: string, doDne: string): string {
  const kratce = (k: string) => {
    const [, m, d] = k.split("-").map(Number);
    return `${d}. ${m}.`;
  };
  return od === doDne ? kratce(od) : `${kratce(od)}–${kratce(doDne)}`;
}

/**
 * Předvyplněný termín odpovědi: dva dny, nejpozději den před změnou,
 * nejdřív dnes. Databáze vyžaduje dnes ≤ termín ≤ první den změny.
 */
export function vychoziTerminOdpovedi(od: string, dnes: string): string {
  const plus = (k: string, dni: number) => {
    const d = new Date(`${k}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + dni);
    return d.toISOString().slice(0, 10);
  };
  const zaDva = plus(dnes, 2);
  const denPred = plus(od, -1);
  const termin = zaDva < denPred ? zaDva : denPred;
  return termin < dnes ? dnes : termin;
}
