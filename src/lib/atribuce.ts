/**
 * Odkud návštěvník veřejného webu přišel.
 *
 * Zapamatuje se při prvním zobrazení a drží se po dobu návštěvy, takže
 * proklik z článku do formuláře atribuci neztratí — jinak by se každý lead
 * tvářil, že přišel z našeho vlastního webu.
 *
 * Je to údaj o kanálu, ne o osobě: nic se nepárvuje k profilu a po zavření
 * karty to zmizí.
 */

const KLIC = "klidoo_odkud";

export interface Puvod {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  /** Kód partnera z affiliate programu (advokát, mediátor). */
  ref: string;
  referrer: string;
  /** První stránka návštěvy. */
  landing: string;
}

const PRAZDNY: Puvod = {
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  ref: "",
  referrer: "",
  landing: "",
};

/**
 * Vrátí zapamatovaný původ. Když ještě žádný není, přečte ho z adresy
 * a uloží — proto se má volat na každé veřejné stránce, ne až u formuláře.
 */
export function zapamatujPuvod(): Puvod {
  if (typeof window === "undefined") return PRAZDNY;

  try {
    const ulozene = sessionStorage.getItem(KLIC);
    if (ulozene) return { ...PRAZDNY, ...JSON.parse(ulozene) };
  } catch {
    // Soukromé okno nebo zakázané úložiště — atribuci prostě nebudeme mít.
  }

  const p = new URLSearchParams(window.location.search);
  const novy: Puvod = {
    utm_source: p.get("utm_source") ?? "",
    utm_medium: p.get("utm_medium") ?? "",
    utm_campaign: p.get("utm_campaign") ?? "",
    ref: p.get("ref") ?? "",
    referrer: document.referrer,
    landing: window.location.pathname,
  };

  try {
    sessionStorage.setItem(KLIC, JSON.stringify(novy));
  } catch {
    // Nevadí, jen se původ nepřenese na další stránku.
  }

  return novy;
}
