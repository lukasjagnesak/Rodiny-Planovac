/**
 * Nápady na dárky — stavy, popisky a co se s dárkem dá dělat.
 *
 * Pravidla drží databáze (migrace 0038); tady se jen rozhoduje, která
 * tlačítka ukázat.
 */
import type { Darek, Prilezitost } from "./types";

export const PRILEZITOSTI: Record<Prilezitost, string> = {
  narozeniny: "Narozeniny",
  svatek: "Svátek",
  vanoce: "Vánoce",
  jine: "Jindy",
};

export type StavDarku = "volny" | "zamluveny" | "koupeny" | "darovany";

export function stavDarku(d: Pick<Darek, "koupi" | "koupeno_at" | "darovano">): StavDarku {
  if (d.darovano) return "darovany";
  if (d.koupeno_at) return "koupeny";
  if (d.koupi) return "zamluveny";
  return "volny";
}

export type AkceDarku = "zamluvit" | "uvolnit" | "koupeno" | "darovano" | "upravit" | "smazat";

export function akceDarku(
  d: Pick<Darek, "koupi" | "koupeno_at" | "darovano">,
  ja: string,
  muzeUpravovat: boolean,
): AkceDarku[] {
  if (!muzeUpravovat) return [];
  const stav = stavDarku(d);
  const muj = d.koupi === ja;
  const akce: AkceDarku[] = [];
  if (stav === "volny") akce.push("zamluvit");
  if (stav === "zamluveny" && muj) akce.push("koupeno", "uvolnit");
  if (stav === "koupeny" && muj) akce.push("darovano", "uvolnit");
  if (stav !== "darovany") akce.push("upravit");
  // Zamluvený někým jiným nejde smazat — kupujícímu by zmizel.
  if (!d.koupi || muj) akce.push("smazat");
  return akce;
}

/** Popis stavu z pohledu toho, kdo se dívá. */
export function popisStavu(d: Pick<Darek, "koupi" | "koupi_jmeno" | "koupeno_at" | "darovano">, ja: string): string {
  const kdo = d.koupi === ja ? "vy" : (d.koupi_jmeno ?? "druhý rodič");
  switch (stavDarku(d)) {
    case "darovany":
      return "darováno";
    case "koupeny":
      return d.koupi === ja ? "koupili jste" : `koupeno · ${kdo}`;
    case "zamluveny":
      return d.koupi === ja ? "kupujete vy" : `koupí ${kdo}`;
    default:
      return "volné";
  }
}

/**
 * Kolik dní zbývá do příštích narozenin (0 = dnes). Narozeným 29. 2.
 * se v nepřestupném roce slaví 28. 2.
 */
export function dniDoNarozenin(narozeni: string, dnes: string): number {
  const [, m, d] = narozeni.split("-").map(Number);
  const [r, dm, dd] = dnes.split("-").map(Number);
  const den = (rok: number) => {
    const posledni = new Date(Date.UTC(rok, m, 0)).getUTCDate();
    return Date.UTC(rok, m - 1, Math.min(d, posledni));
  };
  const dnesUtc = Date.UTC(r, dm - 1, dd);
  let cil = den(r);
  if (cil < dnesUtc) cil = den(r + 1);
  return Math.round((cil - dnesUtc) / 86_400_000);
}

/** Kolik let dítěti bude na příštích narozeninách. */
export function budeLet(narozeni: string, dnes: string): number {
  const [rn] = narozeni.split("-").map(Number);
  const [r] = dnes.split("-").map(Number);
  const letos = narozeni.slice(5) >= dnes.slice(5) ? r : r + 1;
  return letos - rn;
}
