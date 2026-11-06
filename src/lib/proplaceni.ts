/**
 * Žádost o proplacení výdaje — co se s ní dá v kterém stavu dělat.
 *
 * Pravidla drží databáze (migrace 0036); tohle jen rozhoduje, která
 * tlačítka ukázat, aby rodič nenarážel na odmítnutí.
 */
import type { StavProplaceni, ZadostProplaceni } from "./types";

export const STAV_PROPLACENI: Record<StavProplaceni, { nazev: string; barva: string }> = {
  ceka: { nazev: "čeká na schválení", barva: "var(--warning)" },
  schvaleno: { nazev: "schváleno, čeká na platbu", barva: "var(--brand)" },
  rozporovano: { nazev: "rozporováno", barva: "var(--danger)" },
  zaplaceno: { nazev: "proplaceno", barva: "var(--success)" },
  zruseno: { nazev: "žádost zrušena", barva: "var(--ink-subtle)" },
};

/** Podíl druhého rodiče na haléře — stejně jako ho spočítá databáze. */
export function podilKProplaceni(castka: number, procento: number): number {
  return Math.round(Number(castka) * Number(procento)) / 100;
}

/** Nejnovější žádost k výdaji, která nebyla zrušená. */
export function posledniZadost(zadosti: ZadostProplaceni[] | undefined): ZadostProplaceni | null {
  const platne = (zadosti ?? []).filter((z) => z.stav !== "zruseno");
  if (platne.length === 0) return null;
  return platne.reduce((a, b) => (a.created_at >= b.created_at ? a : b));
}

export type AkceProplaceni = "pozadat" | "odpovedet" | "potvrdit" | "zrusit";

export function akceProplaceni(vstup: {
  vydaj: { paid_by: string | null; settled: boolean; amount: number; split_percent: number };
  zadost: ZadostProplaceni | null;
  ja: string;
  jeRodic: boolean;
  dvaRodice: boolean;
}): AkceProplaceni[] {
  const { vydaj, zadost, ja, jeRodic, dvaRodice } = vstup;
  if (!jeRodic || !dvaRodice) return [];
  const mojeZadost = zadost?.pozadal === ja;

  if (!zadost || zadost.stav === "zaplaceno") {
    const muzu =
      !vydaj.settled &&
      vydaj.paid_by === ja &&
      podilKProplaceni(vydaj.amount, vydaj.split_percent) > 0;
    return muzu && !zadost ? ["pozadat"] : [];
  }
  if (zadost.stav === "ceka") return mojeZadost ? ["zrusit"] : ["odpovedet"];
  if (zadost.stav === "schvaleno") return mojeZadost ? ["potvrdit"] : [];
  // Rozporovaná: žadatel ji zruší (a výdaj případně opraví a požádá znovu).
  if (zadost.stav === "rozporovano") return mojeZadost ? ["zrusit"] : [];
  return [];
}
