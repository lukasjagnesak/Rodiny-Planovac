"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { zapamatujPuvod } from "@/lib/atribuce";
import { zmer } from "@/lib/mereni";

/**
 * Zapamatuje si původ návštěvy a nahlásí zobrazení stránky.
 *
 * Musí to být tady v layoutu, ne až ve formuláři: člověk často přistane na
 * článku a odešle e-mail o dvě stránky dál, kde už v adrese žádné utm ani
 * partnerský kód nejsou.
 */
export function SledovaniPuvodu() {
  const cesta = usePathname();

  React.useEffect(() => {
    zapamatujPuvod();
    zmer("zobrazeni", cesta);
  }, [cesta]);

  return null;
}
