"use client";

import * as React from "react";
import { vAplikaciKlient } from "./nativni";

/**
 * V klientské komponentě: běží stránka v aplikaci z obchodu?
 *
 * Při prvním vykreslení vrací `false` (server to neví stejně jako
 * prohlížeč), po připojení skutečnou hodnotu. Prvky s nákupem proto
 * schovávejte i na serveru přes `vAplikaci()`, kde to jde.
 */
export function useVAplikaci(): boolean {
  const [v, setV] = React.useState(false);
  React.useEffect(() => setV(vAplikaciKlient()), []);
  return v;
}
