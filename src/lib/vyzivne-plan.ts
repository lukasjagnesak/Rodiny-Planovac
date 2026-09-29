/**
 * Most z kalkulačky výživného do aplikace.
 *
 * Překládá zadání, které člověk naklikal na veřejné stránce, na to, co
 * umí průvodce zakládáním rodiny: kolik dětí, jaký rozvrh a jaká
 * opakovaná částka.
 *
 * Je to schválně čistý překlad bez databáze i bez Reactu — tohle je
 * místo, kde se dá splést podíl péče se stranou rodiče, a takovou chybu
 * má najít test, ne uživatel.
 */

import type { PatternKind } from "./types";

/** Nejvíc dětí, kolik kalkulačka pustí dál. Drží se s `MAX_DETI`. */
export const MAX_ETAP = 6;

/**
 * Pásmo kolem poloviny, které bereme jako rovnoměrnou péči.
 *
 * Nikdo neklikne přesně 50 % a nemyslí tím „týden u mě, týden u tebe".
 * Naopak 60/40 už týdenní střídání není a tvrdit to by znamenalo
 * předvyplnit kalendář, který neodpovídá skutečnosti.
 */
export const ROVNOMERNE = { od: 45, do: 55 };

/**
 * Pásmo, kde má dítě jeden rodič prakticky pořád. Mezi ním a
 * rovnoměrnou péčí rozvrh nepředvyplňujeme — aplikace pro 60/40 žádný
 * vzor nemá a vybrat nejbližší by byl odhad vydávaný za zadání.
 */
export const TEMER_VYHRADNE = 80;

export interface PrevzatyRozvrh {
  kind: PatternKind;
  /** U `fixed_parent` strana, u které dítě je. */
  anchorSide: "a" | "b";
}

/** Rozvrh odpovídající podílu péče, nebo `null`, když se nedá odvodit. */
export function rozvrhZPece(peceA: number): PrevzatyRozvrh | null {
  if (!Number.isFinite(peceA)) return null;
  if (peceA >= ROVNOMERNE.od && peceA <= ROVNOMERNE.do) {
    return { kind: "iso_week_parity", anchorSide: "a" };
  }
  if (peceA >= TEMER_VYHRADNE) return { kind: "fixed_parent", anchorSide: "a" };
  if (peceA <= 100 - TEMER_VYHRADNE) return { kind: "fixed_parent", anchorSide: "b" };
  return null;
}

/** Co se přenáší z kalkulačky. Příjmy mezi tím nejsou a nebudou. */
export interface VyzivnePlan {
  etapy: string[];
  peceA: number;
  /** Kdo platí; `null`, když se výživné nestanovuje. */
  plati: "a" | "b" | null;
  /** Měsíčně za všechny děti dohromady. */
  castka: number;
}

/** Předvyplnění průvodce z převzatého plánu. */
export interface PrevzateVyzivne {
  /** Částka měsíčně. */
  castka: number;
  /** Strana rodiče, který platí. */
  plati: "a" | "b";
}

/**
 * Opakovaný výdaj, který z plánu vznikne.
 *
 * `split_percent` je podíl, který nese DRUHÝ rodič než ten, kdo platil.
 * U výživného je nula: není to společný výdaj k rozpočítání, ale převod
 * od jednoho rodiče druhému. Kdyby tam bylo sto, vyrovnání by tvrdilo,
 * že příjemce tu částku plátci dluží — tedy pravý opak.
 */
export const VYZIVNE_NEDELI_SE = 0;

/** Titulek opakovaného výdaje. Vidí ho oba rodiče, proto bez jmen. */
export const VYZIVNE_TITULEK = "Výživné";

/**
 * Dá se z plánu vůbec něco přenést?
 *
 * Když se výživné nestanovuje, částka je nula a opakovaný výdaj by byl
 * jen zmatek navíc. Rozvrh a počet dětí se přenášejí pořád.
 */
export function maCastku(plan: VyzivnePlan): plan is VyzivnePlan & { plati: "a" | "b" } {
  return plan.plati !== null && plan.castka > 0;
}
