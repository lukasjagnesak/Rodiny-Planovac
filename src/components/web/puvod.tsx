"use client";

import * as React from "react";
import { zapamatujPuvod } from "@/lib/atribuce";

/**
 * Zapamatuje si původ návštěvy hned při zobrazení stránky.
 *
 * Musí to být tady v layoutu, ne až ve formuláři: člověk často přistane na
 * článku a odešle e-mail o dvě stránky dál, kde už v adrese žádné utm ani
 * partnerský kód nejsou.
 */
export function SledovaniPuvodu() {
  React.useEffect(() => {
    zapamatujPuvod();
  }, []);

  return null;
}
