"use client";

import { usePathname } from "next/navigation";
import { VyzvaRegistrace } from "./vyzva-registrace";

/**
 * Stránky, na kterých tlačítko v záhlaví chybí schválně.
 *
 * Na kalkulačku výživného vede placená kampaň a pod výsledkem je nabídka,
 * která si výpočet přenese do aplikace. Tlačítko v záhlaví by vedlo na
 * holou registraci — dřív, než člověk něco spočítal, a bez toho, co
 * naklikal. Na stránce, kam se platí za návštěvu, má být jedna cesta
 * ve správnou chvíli, ne dvě hned na začátku.
 */
const BEZ_VYZVY = new Set(["/kalkulacka-vyzivneho"]);

export function HlavickaVyzva() {
  const cesta = usePathname();
  if (BEZ_VYZVY.has(cesta)) return null;

  return (
    <VyzvaRegistrace
      stranka={cesta === "/" ? "homepage" : cesta.slice(1).split("/")[0] || "web"}
      misto="hlavicka"
      className="inline-flex h-10 items-center rounded-xl bg-brand px-3 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-hover sm:px-4"
    >
      Začít<span className="hidden xs:inline">&nbsp;zdarma</span>
    </VyzvaRegistrace>
  );
}
