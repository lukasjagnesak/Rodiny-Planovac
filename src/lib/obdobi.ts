/**
 * Období, za které se počítá souhrn pro soud.
 *
 * Bydlí v `lib`, ne u komponenty s výběrem, a je to podstatné: modul
 * označený `"use client"` se ze serverové komponenty nedá volat. Import
 * projde, sestavení projde, a teprve při otevření stránky přijde
 * „Attempted to call … from the server but … is on the client".
 * Přesně tak se `/souhrn` rozbil.
 *
 * Pravidlo je proto jednoduché: co potřebuje server i prohlížeč, patří
 * sem. V komponentě zůstane jen to, co kreslí.
 */

import {
  endOfMonth,
  endOfYear,
  startOfMonth,
  startOfYear,
  subMonths,
  subYears,
} from "date-fns";
import { toDateKey } from "./dates";

/**
 * Předvolby nejsou náhodné — jsou to lhůty, na které se ptají soudy
 * a úřady: uplynulý rok kvůli rozsahu péče, loňský kalendářní rok kvůli
 * doložení nákladů, tento měsíc na běžnou kontrolu mezi rodiči.
 */
export const PREDVOLBY = {
  "tento-mesic": {
    popisek: "Tento měsíc",
    rozsah: () => ({ od: startOfMonth(new Date()), do: endOfMonth(new Date()) }),
  },
  "minulych-12": {
    popisek: "Posledních 12 měsíců",
    rozsah: () => ({ od: subMonths(new Date(), 12), do: new Date() }),
  },
  letos: {
    popisek: "Letos",
    rozsah: () => ({ od: startOfYear(new Date()), do: new Date() }),
  },
  loni: {
    popisek: "Loni",
    rozsah: () => {
      const loni = subYears(new Date(), 1);
      return { od: startOfYear(loni), do: endOfYear(loni) };
    },
  },
} as const;

export type KlicObdobi = keyof typeof PREDVOLBY | "vlastni";

/**
 * Přeloží parametry z adresy na skutečné období.
 *
 * Nesmyslné datum v adrese nesmí shodit stránku — vrátí se výchozí
 * období. Dokument za jiné období je horší chyba než dokument, který
 * se nevykreslí vůbec, ale u adresy, kterou si někdo zkrátil při
 * kopírování, je to správná volba: vidí, jaké období je vybrané.
 */
export function urciObdobi(
  od?: string,
  doData?: string,
): { od: Date; do: Date; klic: KlicObdobi } {
  const platne = (h?: string) => {
    if (!h || !/^\d{4}-\d{2}-\d{2}$/.test(h)) return null;
    const d = new Date(`${h}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const zacatek = platne(od);
  const konec = platne(doData);

  if (zacatek && konec && zacatek <= konec) {
    // Když se rozsah trefí do předvolby, ukáže se jako vybraná.
    for (const [klic, p] of Object.entries(PREDVOLBY)) {
      const r = p.rozsah();
      if (toDateKey(r.od) === toDateKey(zacatek) && toDateKey(r.do) === toDateKey(konec)) {
        return { od: zacatek, do: konec, klic: klic as KlicObdobi };
      }
    }
    return { od: zacatek, do: konec, klic: "vlastni" };
  }

  const vychozi = PREDVOLBY["minulych-12"].rozsah();
  return { od: vychozi.od, do: vychozi.do, klic: "minulych-12" };
}
