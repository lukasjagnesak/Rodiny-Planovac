import { addDays, addMonths, eachDayOfInterval, endOfMonth, startOfMonth } from "date-fns";
import { custodyBlocks, custodyStats, resolveCustody, type CustodyBlock } from "./custody";
import { toDateKey, fromDateKey } from "./dates";
import type { CustodyPattern, CustodySide, PatternKind } from "./types";

/**
 * Zadání z veřejné kalkulačky.
 *
 * Schválně tu nejsou jména dětí — k výpočtu nejsou potřeba a veřejný
 * nástroj bez přihlášení není místo, kde by měly ležet.
 */
export interface PlanVstup {
  kind: PatternKind;
  /** Datum, od kterého se cyklus počítá. */
  anchorDate: string;
  /** Strana, která má sudý týden (u parity) nebo první týden cyklu. */
  anchorSide: CustodySide;
  weeklyMap: string;
  pocetDeti: number;
  jmenoA: string;
  jmenoB: string;
}

export const VYCHOZI_VSTUP: PlanVstup = {
  kind: "iso_week_parity",
  anchorDate: "",
  anchorSide: "a",
  weeklyMap: "aabbaab",
  pocetDeti: 1,
  jmenoA: "U mě",
  jmenoB: "U druhého rodiče",
};

/**
 * Ze zadání udělá vzor v tom tvaru, jaký používá zbytek aplikace.
 *
 * Díky tomu počítá kalkulačka stejným kódem jako kalendář — kdyby se
 * lišily, lidem by po registraci vyšlo něco jiného, než co jim slíbila
 * veřejná stránka.
 */
export function vzorZPlanu(vstup: PlanVstup): CustodyPattern {
  return {
    id: "kalkulacka",
    family_id: "kalkulacka",
    child_id: null,
    kind: vstup.kind,
    starts_on: "1970-01-01",
    ends_on: null,
    anchor_date: vstup.anchorDate,
    anchor_side: vstup.anchorSide,
    weekly_map: vstup.kind === "custom_weekly" ? vstup.weeklyMap : null,
    fixed_side: vstup.kind === "fixed_parent" ? vstup.anchorSide : null,
    handover_dow: 1,
    handover_time: "18:00",
    note: null,
  };
}

export interface MesicniPrehled {
  /** `YYYY-MM` */
  klic: string;
  zacatek: Date;
  nociA: number;
  nociB: number;
}

export interface VysledekPlanu {
  /** Dvanáct měsíců dopředu od začátku aktuálního měsíce. */
  mesice: MesicniPrehled[];
  rokNociA: number;
  rokNociB: number;
  procentA: number;
  procentB: number;
  /** Souvislé pobyty na nejbližší dva měsíce — z toho se dělá seznam předání. */
  bloky: CustodyBlock[];
  /** Dny nejbližších tří měsíců pro vykreslení kalendáře. */
  dny: { klic: string; datum: Date; strana: CustodySide | null; predani: boolean }[];
}

/** Spočítá rok dopředu. Běží v prohlížeči — nic se nikam neposílá. */
export function spocitejPlan(vstup: PlanVstup, dnes = new Date()): VysledekPlanu {
  const pattern = vzorZPlanu(vstup);
  const zacatekRoku = startOfMonth(dnes);

  const mesice: MesicniPrehled[] = [];
  let rokNociA = 0;
  let rokNociB = 0;

  for (let i = 0; i < 12; i += 1) {
    const zacatek = addMonths(zacatekRoku, i);
    // O den navíc: poslední noc v měsíci patří tomu, kdo má první den
    // toho dalšího. Bez něj by se na každém přelomu jedna noc ztratila
    // a rok by vyšel o dvanáct nocí kratší.
    const dny = eachDayOfInterval({
      start: zacatek,
      end: addDays(endOfMonth(zacatek), 1),
    });
    const vyreseno = resolveCustody({
      days: dny,
      patterns: [pattern],
      overrides: [],
      childId: null,
    });
    // Poslední prvek je první den dalšího měsíce — patří mu poslední noc,
    // ale ne den. Proto jde do statistiky zvlášť.
    const statistika = custodyStats(vyreseno.slice(0, -1), vyreseno[vyreseno.length - 1]);

    mesice.push({
      klic: toDateKey(zacatek).slice(0, 7),
      zacatek,
      nociA: statistika.nightsA,
      nociB: statistika.nightsB,
    });
    rokNociA += statistika.nightsA;
    rokNociB += statistika.nightsB;
  }

  // Tři měsíce na vykreslení a dva na seznam předání — dál dopředu to
  // nikdo neplánuje a stránka by se zbytečně nafoukla.
  const naZobrazeni = resolveCustody({
    days: eachDayOfInterval({
      start: zacatekRoku,
      end: endOfMonth(addMonths(zacatekRoku, 2)),
    }),
    patterns: [pattern],
    overrides: [],
    childId: null,
  });

  const celkem = rokNociA + rokNociB;
  const dnesKlic = toDateKey(dnes);

  return {
    mesice,
    rokNociA,
    rokNociB,
    procentA: celkem ? Math.round((rokNociA / celkem) * 100) : 0,
    procentB: celkem ? Math.round((rokNociB / celkem) * 100) : 0,
    // Pobyty, které už skončily, nikoho nezajímají — seznam začíná dneškem.
    bloky: custodyBlocks(naZobrazeni)
      .filter((b) => b.endKey >= dnesKlic)
      .slice(0, 12),
    dny: naZobrazeni.map((d) => ({
      klic: d.key,
      datum: d.date,
      strana: d.side,
      predani: d.isHandover,
    })),
  };
}

/** Nejbližší předání ode dneška — první věta, kterou chce člověk vidět. */
export function nejblizsiPredani(
  vysledek: VysledekPlanu,
  dnes = new Date(),
): { den: string; strana: CustodySide } | null {
  const dnesKlic = toDateKey(dnes);
  const dalsi = vysledek.dny.find((d) => d.predani && d.klic >= dnesKlic && d.strana !== null);
  return dalsi ? { den: dalsi.klic, strana: dalsi.strana! } : null;
}

/** Kontrola zadání, než se pošle na server. */
export function zkontrolujVstup(vstup: PlanVstup): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vstup.anchorDate)) {
    return "Vyber datum, od kterého se má střídání počítat.";
  }
  try {
    fromDateKey(vstup.anchorDate);
  } catch {
    return "Datum není platné.";
  }
  if (vstup.kind === "custom_weekly" && ![7, 14].includes(vstup.weeklyMap.length)) {
    return "Vlastní rozpis musí mít sedm nebo čtrnáct dnů.";
  }
  if (vstup.pocetDeti < 1 || vstup.pocetDeti > 6) return "Počet dětí musí být jedna až šest.";
  return null;
}
