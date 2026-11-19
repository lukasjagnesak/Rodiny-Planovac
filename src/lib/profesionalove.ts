/**
 * Přístup pro profesionály — advokát, mediátor, OSPOD, soud. Vidí jen
 * ke čtení, přístup mívá datum konce a kterýkoli rodič ho smí odebrat.
 * Pravidla hlídá databáze (migrace 0035); tady jsou popisky a počty dní
 * pro obrazovku.
 */
import type { Profese } from "./types";

export const PROFESE: { id: Profese; nazev: string }[] = [
  { id: "advokat", nazev: "Advokát/ka" },
  { id: "mediator", nazev: "Mediátor/ka" },
  { id: "ospod", nazev: "OSPOD" },
  { id: "soud", nazev: "Soud" },
  { id: "jiny", nazev: "Jiný profesionál" },
];

export function nazevProfese(p: Profese | null | undefined): string {
  return PROFESE.find((x) => x.id === p)?.nazev ?? "Profesionál";
}

/** Nabídka délky přístupu. 0 = bez data konce. */
export const PLATNOSTI: { mesicu: number; nazev: string }[] = [
  { mesicu: 1, nazev: "1 měsíc" },
  { mesicu: 3, nazev: "3 měsíce" },
  { mesicu: 6, nazev: "6 měsíců" },
  { mesicu: 12, nazev: "1 rok" },
  { mesicu: 0, nazev: "Bez data konce" },
];

export const VYCHOZI_PLATNOST = 3;

function klic(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const den = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${den}`;
}

/**
 * Poslední den přístupu za `mesicu` měsíců od `dnes` (YYYY-MM-DD).
 * 31. 1. + 1 měsíc = 28./29. 2., ne 3. 3.
 */
export function pristupDo(mesicu: number, dnes: string): string | null {
  if (mesicu <= 0) return null;
  const [r, m, d] = dnes.split("-").map(Number);
  const cil = new Date(r, m - 1 + mesicu, 1);
  const posledni = new Date(cil.getFullYear(), cil.getMonth() + 1, 0).getDate();
  return klic(new Date(cil.getFullYear(), cil.getMonth(), Math.min(d, posledni)));
}

/** Platí přístup ještě dnes? Bez data konce platí vždy. */
export function pristupPlati(doDne: string | null, dnes: string): boolean {
  return !doDne || doDne >= dnes;
}

/** Kolik dní přístupu zbývá včetně dneška; null = bez konce. */
export function zbyvaDni(doDne: string | null, dnes: string): number | null {
  if (!doDne) return null;
  const ms = Date.parse(`${doDne}T00:00:00Z`) - Date.parse(`${dnes}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000) + 1);
}
