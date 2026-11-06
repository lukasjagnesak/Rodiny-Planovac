"use client";

import * as React from "react";
import { spocitejPlan, type PlanVstup } from "@/lib/kalkulacka";
import { Vysledek } from "./vysledek";

/**
 * Sdílený rozpis se počítá v prohlížeči ze stejného zadání jako kalkulačka.
 * Na server se ukládá jen vzor, ne hotový rozpis — kdyby se výpočet někdy
 * opravil, sdílené odkazy se opraví s ním.
 */
export function SdilenyVysledek({ vstup }: { vstup: PlanVstup }) {
  const vysledek = React.useMemo(() => spocitejPlan(vstup), [vstup]);
  return <Vysledek vstup={vstup} vysledek={vysledek} />;
}
