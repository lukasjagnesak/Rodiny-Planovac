/**
 * Náhled rozpisu na vstupní stránce z reklamy.
 *
 * Člověk z reklamy nás nezná a na „zaregistrujte se" neklikne. Na „podívejte
 * se, jak to bude vypadat u vás" ano. Proto dvě otázky, na které zná odpověď
 * bez přemýšlení — jak se střídáte a u koho jsou děti teď — a hned celý
 * měsíc v barvách obou domácností. Datum se neptáme: počítá se od pondělí
 * tohoto týdne, protože „teď" ví každý, kdežto „od kdy se to počítá" ne.
 *
 * Výsledek je obyčejné zadání kalkulačky (`PlanVstup`), takže se uloží a do
 * aplikace přenese stejnou cestou jako z `/kalkulacka` — a počítá stejným
 * kódem jako kalendář v aplikaci. Co člověk uvidí tady, uvidí i po registraci.
 */

import { addDays, startOfWeek } from "date-fns";
import { custodyStatsForRange, resolveCustody } from "./custody";
import { toDateKey, WEEK_OPTS } from "./dates";
import { vzorZPlanu, type PlanVstup } from "./kalkulacka";
import type { CustodySide } from "./types";

export type Rytmus = "tyden" | "223" | "vikendy";
/** „Já" je vždycky strana A — stejně jako v kalkulačce a v průvodci. */
export type Kdo = "ja" | "druhy";

export const RYTMY: { id: Rytmus; nazev: string; popis: string; otazka: string }[] = [
  {
    id: "tyden",
    nazev: "Po týdnu",
    popis: "týden a týden",
    otazka: "U koho jsou děti tento týden?",
  },
  {
    id: "223",
    nazev: "2-2-3",
    popis: "Po–Út, St–Čt, Pá–Ne",
    otazka: "U koho jsou děti toto pondělí a úterý?",
  },
  {
    id: "vikendy",
    nazev: "Víkendy",
    popis: "každý druhý víkend",
    otazka: "U koho jsou děti přes týden?",
  },
];

/** Pondělí týdne, do kterého padá `dnes`. */
export function pondeliTohotoTydne(dnes: Date): Date {
  return startOfWeek(dnes, WEEK_OPTS);
}

/**
 * Víkend u druhého rodiče každých čtrnáct dní.
 *
 * Pátek a sobota patří víkendovému rodiči (dvě noci), v neděli se dítě
 * vrací. Začíná se tímto víkendem — kdyby byl u druhého až ten příští,
 * posune se to v aplikaci jedním klepnutím, a na náhled to nemá vliv.
 */
function mapaVikendu(prestyden: CustodySide): string {
  const vikend = prestyden === "a" ? "b" : "a";
  const t = prestyden;
  const prvni = `${t}${t}${t}${t}${vikend}${vikend}${t}`;
  const druhy = `${t}${t}${t}${t}${t}${t}${t}`;
  return prvni + druhy;
}

/** Ze dvou odpovědí udělá zadání kalkulačky, které jde uložit a přenést. */
export function planZVolby(rytmus: Rytmus, kdo: Kdo, dnes: Date): PlanVstup {
  const strana: CustodySide = kdo === "ja" ? "a" : "b";
  const zaklad: PlanVstup = {
    kind: "alternating_weeks",
    anchorDate: toDateKey(pondeliTohotoTydne(dnes)),
    anchorSide: strana,
    weeklyMap: "aabbaab",
    pocetDeti: 1,
    jmenoA: "U mě",
    jmenoB: "U druhého rodiče",
  };

  if (rytmus === "223") return { ...zaklad, kind: "week_2_2_3" };
  if (rytmus === "vikendy") {
    // U vlastního rozpisu určuje strany mapa, ne `anchorSide`.
    return { ...zaklad, kind: "custom_weekly", anchorSide: "a", weeklyMap: mapaVikendu(strana) };
  }
  return zaklad;
}

export interface DenNahledu {
  klic: string;
  datum: Date;
  strana: CustodySide | null;
  dnes: boolean;
}

export interface NahledRozvrhu {
  /** Čtyři týdny po sedmi dnech, od pondělí tohoto týdne. */
  tydny: DenNahledu[][];
  nociJa: number;
  nociDruhy: number;
}

/** Čtyři týdny od pondělí tohoto týdne — tolik se vejde na telefon. */
export function nahledCtyrTydnu(vstup: PlanVstup, dnes: Date): NahledRozvrhu {
  const zacatek = pondeliTohotoTydne(dnes);
  const konec = addDays(zacatek, 27);
  const vzor = vzorZPlanu(vstup);
  const dnesKlic = toDateKey(dnes);

  const dny: Date[] = Array.from({ length: 28 }, (_, i) => addDays(zacatek, i));
  const vyreseno = resolveCustody({ days: dny, patterns: [vzor], overrides: [], childId: null });

  const tydny: DenNahledu[][] = [];
  for (let t = 0; t < 4; t += 1) {
    tydny.push(
      vyreseno.slice(t * 7, t * 7 + 7).map((d) => ({
        klic: d.key,
        datum: d.date,
        strana: d.side,
        dnes: d.key === dnesKlic,
      })),
    );
  }

  const statistika = custodyStatsForRange({
    start: zacatek,
    end: konec,
    patterns: [vzor],
    overrides: [],
    childId: null,
  });

  return { tydny, nociJa: statistika.nightsA, nociDruhy: statistika.nightsB };
}
