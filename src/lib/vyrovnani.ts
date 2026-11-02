/**
 * Vyrovnání výdajů — kdo komu kolik dluží a za co.
 *
 * `split_percent` je podíl, který nese ten, kdo výdaj NEzaplatil. Když
 * zaplatil druhý rodič, dlužím já jeho `split_percent`; když jsem
 * zaplatil já, dluží mi ho on. Počítá se přes všechny nevyrovnané
 * výdaje, ne jen ty z právě zobrazeného měsíce — dluh se přelomem
 * měsíce neztrácí.
 *
 * Potvrdit zaplacení smí ten, komu se platilo (hlídá to i databáze,
 * migrace 0039). Výdaj s rozběhnutou žádostí o proplacení se vyrovná
 * potvrzením té žádosti.
 */
import { podilKProplaceni, posledniZadost } from "./proplaceni";
import type { Expense } from "./types";

export interface PolozkaDluhu {
  expense: Expense;
  podil: number;
}

export interface RozpisDluhu {
  mneDluzi: PolozkaDluhu[];
  dluzim: PolozkaDluhu[];
  mneDluziCelkem: number;
  dluzimCelkem: number;
  /** Kladné = dostanu, záporné = mám zaplatit. */
  saldo: number;
}

const zaokrouhli = (n: number) => Math.round(n * 100) / 100;

export function rozpisDluhu(expenses: Expense[], ja: string): RozpisDluhu {
  const mneDluzi: PolozkaDluhu[] = [];
  const dluzim: PolozkaDluhu[] = [];
  for (const e of expenses) {
    if (e.settled || !e.paid_by) continue;
    const podil = podilKProplaceni(e.amount, e.split_percent);
    if (podil <= 0) continue;
    (e.paid_by === ja ? mneDluzi : dluzim).push({ expense: e, podil });
  }
  const podleData = (a: PolozkaDluhu, b: PolozkaDluhu) =>
    a.expense.spent_on < b.expense.spent_on ? -1 : a.expense.spent_on > b.expense.spent_on ? 1 : 0;
  mneDluzi.sort(podleData);
  dluzim.sort(podleData);
  const mneDluziCelkem = zaokrouhli(mneDluzi.reduce((s, p) => s + p.podil, 0));
  const dluzimCelkem = zaokrouhli(dluzim.reduce((s, p) => s + p.podil, 0));
  return { mneDluzi, dluzim, mneDluziCelkem, dluzimCelkem, saldo: zaokrouhli(mneDluziCelkem - dluzimCelkem) };
}

/** Má výdaj rozběhnutou žádost o proplacení (čeká nebo schválená)? */
export function maZivouZadost(e: Expense): boolean {
  const z = posledniZadost(e.zadosti_proplaceni);
  return z?.stav === "ceka" || z?.stav === "schvaleno";
}

/** Smím potvrdit, že je výdaj zaplacený? */
export function smimVyrovnat(e: Expense, ja: string, dvaRodice: boolean): boolean {
  if (e.settled || maZivouZadost(e)) return false;
  return !dvaRodice || !e.paid_by || e.paid_by === ja;
}

function penize(castka: number, mena: string): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: mena,
    maximumFractionDigits: castka % 1 === 0 ? 0 : 2,
  }).format(castka);
}

function den(klic: string): string {
  const [, m, d] = klic.split("-").map(Number);
  return `${d}. ${m}.`;
}

/**
 * Rozpis k zaslání druhému rodiči, který Klidoo nemá: za co a kolik.
 * Jde jako text ke QR kódu (WhatsApp, SMS, e-mail).
 */
export function textRozpisu(vstup: {
  polozky: PolozkaDluhu[];
  castka: number;
  mena: string;
  ucet: string;
  /** Co dlužím já a už je odečtené od částky. */
  odecteno?: number;
}): string {
  const radky = vstup.polozky.map(
    (p) =>
      `• ${p.expense.title} (${den(p.expense.spent_on)}): ${penize(p.podil, vstup.mena)} z ${penize(Number(p.expense.amount), vstup.mena)}`,
  );
  return [
    `Vyrovnání výdajů za děti: ${penize(vstup.castka, vstup.mena)}`,
    "",
    ...radky,
    ...(vstup.odecteno
      ? [`• odečteno, co dlužím já: −${penize(vstup.odecteno, vstup.mena)}`]
      : []),
    "",
    `Na účet ${vstup.ucet}. QR kód je v obrázku, stačí ho naskenovat v aplikaci banky.`,
  ].join("\n");
}
