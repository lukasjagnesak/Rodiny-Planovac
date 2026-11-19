import { JARNI_PRAZDNINY, type JarniTermin } from "./data/jarni-prazdniny";
import { toDateKey, fromDateKey } from "./dates";

/**
 * Školní prázdniny podle vyhlášky č. 16/2005 Sb.
 *
 * Většinu termínů vyhláška určuje přesně, takže se dají spočítat:
 *   • vánoční      — 23. 12. až 2. 1., s posunem podle dne v týdnu
 *   • pololetní    — pátek v období 29. 1. až 4. 2.
 *   • jarní        — tabulka okresů v příloze vyhlášky
 *   • velikonoční  — čtvrtek před Velkým pátkem
 *   • hlavní       — červenec a srpen
 *
 * Výjimkou jsou podzimní prázdniny: vyhláška u nich říká jen „2 dny kolem
 * 28. října“ a přesný termín vyhlašuje ministerstvo na každý rok zvlášť.
 * Nedají se tedy spolehlivě odvodit a aplikace si je nevymýšlí — rodina si
 * je zadá jako běžnou událost.
 */

export type HolidayKind =
  | "vanocni"
  | "pololetni"
  | "jarni"
  | "velikonocni"
  | "hlavni";

export interface Holiday {
  kind: HolidayKind;
  label: string;
  /** První den včetně, `YYYY-MM-DD`. */
  from: string;
  /** Poslední den včetně. */
  to: string;
}

export const HOLIDAY_LABELS: Record<HolidayKind, string> = {
  vanocni: "Vánoční prázdniny",
  pololetni: "Pololetní prázdniny",
  jarni: "Jarní prázdniny",
  velikonocni: "Velikonoční prázdniny",
  hlavni: "Hlavní prázdniny",
};

function key(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 0 = neděle … 6 = sobota */
function dow(k: string): number {
  return fromDateKey(k).getDay();
}

function shift(k: string, days: number): string {
  const d = fromDateKey(k);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/**
 * Velikonoční neděle podle gregoriánského kalendáře
 * (Meeusův–Jonesův–Butcherův algoritmus).
 */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k2 = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k2) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return key(year, month, day);
}

/**
 * Vánoční prázdniny začínající v prosinci daného roku.
 * Trvají od 23. 12. do 2. 1.; připadne-li 23. 12. na úterý, začínají už
 * předchozím pondělím, a připadne-li 3. 1. na pátek, končí tímto pátkem.
 */
export function vanocniPrazdniny(december: number): Holiday {
  const start23 = key(december, 12, 23);
  const from = dow(start23) === 2 ? shift(start23, -1) : start23;

  const jan3 = key(december + 1, 1, 3);
  const to = dow(jan3) === 5 ? jan3 : key(december + 1, 1, 2);

  return { kind: "vanocni", label: HOLIDAY_LABELS.vanocni, from, to };
}

/** Pololetní prázdniny — jediný pátek v období 29. 1. až 4. 2. */
export function pololetniPrazdniny(year: number): Holiday {
  for (let day = 29; day <= 35; day += 1) {
    const k = day <= 31 ? key(year, 1, day) : key(year, 2, day - 31);
    if (dow(k) === 5) {
      return { kind: "pololetni", label: HOLIDAY_LABELS.pololetni, from: k, to: k };
    }
  }
  // Nemůže nastat — sedm po sobě jdoucích dní vždy obsahuje pátek.
  throw new Error("Pololetní prázdniny se nepodařilo určit.");
}

/** Velikonoční prázdniny — čtvrtek před Velkým pátkem, tedy jeden den. */
export function velikonocniPrazdniny(year: number): Holiday {
  const ctvrtek = shift(easterSunday(year), -3);
  return {
    kind: "velikonocni",
    label: HOLIDAY_LABELS.velikonocni,
    from: ctvrtek,
    to: ctvrtek,
  };
}

/** Hlavní prázdniny — červenec a srpen. */
export function hlavniPrazdniny(year: number): Holiday {
  return {
    kind: "hlavni",
    label: HOLIDAY_LABELS.hlavni,
    from: key(year, 7, 1),
    to: key(year, 8, 31),
  };
}

/** Označení školního roku, do kterého kalendářní datum spadá. */
export function skolniRok(dateKey: string): string {
  const [y, m] = dateKey.split("-").map(Number);
  return m >= 9 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

/**
 * Jarní prázdniny pro daný okres a školní rok.
 * Vrátí `null`, pokud vyhláška daný školní rok zatím nepokrývá — v takovém
 * případě je lepší nezobrazit nic než zobrazit vymyšlený termín.
 */
export function jarniPrazdniny(okres: string, rok: string): Holiday | null {
  const table = JARNI_PRAZDNINY[rok];
  if (!table) return null;

  const found = table.find((t: JarniTermin) => t.okresy.includes(okres));
  if (!found) return null;

  return { kind: "jarni", label: HOLIDAY_LABELS.jarni, from: found.od, to: found.do };
}

/** Nejpozdější školní rok, který má aplikace podložený vyhláškou. */
export function poslednizanmyRok(): string {
  return Object.keys(JARNI_PRAZDNINY).sort().slice(-1)[0];
}

/**
 * Všechny prázdniny zasahující do zadaného období.
 * Bez okresu se jarní prázdniny vynechají — nejde je určit.
 */
export function holidaysInRange(
  fromKey: string,
  toKey: string,
  okres: string | null,
): Holiday[] {
  const firstYear = Number(fromKey.slice(0, 4));
  const lastYear = Number(toKey.slice(0, 4));

  const all: Holiday[] = [];
  for (let y = firstYear - 1; y <= lastYear + 1; y += 1) {
    all.push(vanocniPrazdniny(y));
    all.push(pololetniPrazdniny(y));
    all.push(velikonocniPrazdniny(y));
    all.push(hlavniPrazdniny(y));

    if (okres) {
      for (const rok of [`${y - 1}/${y}`, `${y}/${y + 1}`]) {
        const jarni = jarniPrazdniny(okres, rok);
        if (jarni && !all.some((h) => h.kind === "jarni" && h.from === jarni.from)) {
          all.push(jarni);
        }
      }
    }
  }

  return all
    .filter((h) => h.to >= fromKey && h.from <= toKey)
    .sort((a, b) => a.from.localeCompare(b.from));
}

/** Mapa `YYYY-MM-DD` → prázdniny, pro rychlé obarvení kalendáře. */
export function holidayByDay(holidays: Holiday[]): Map<string, Holiday> {
  const map = new Map<string, Holiday>();
  for (const h of holidays) {
    let cursor = h.from;
    // Pojistka proti nekonečné smyčce u poškozených dat.
    for (let guard = 0; cursor <= h.to && guard < 400; guard += 1) {
      map.set(cursor, h);
      cursor = shift(cursor, 1);
    }
  }
  return map;
}
