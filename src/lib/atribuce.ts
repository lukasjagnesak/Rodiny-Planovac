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

/**
 * Partnerský kód se drží zvlášť a dýl než zbytek původu.
 *
 * Zbytek atribuce žije v `sessionStorage` a se zavřením karty zmizí —
 * pro měření kanálu to stačí. Doporučení od mediátora ale musí přežít
 * to, co se doopravdy stane: klient si na sezení otevře odkaz, doma
 * o tom přemýšlí týden a zaregistruje se za deset dní. Kdyby kód zmizel
 * se zavřením karty, partner by o provizi přišel a nikdy by se
 * nedozvěděl proč.
 */
const KLIC_REF = "klidoo_ref";

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

  if (novy.ref) ulozRef(novy.ref);

  return novy;
}

interface UlozenyRef {
  kod: string;
  /** Kdy klient na odkaz klikl. Od téhle chvíle běží platnost. */
  kdy: string;
}

/**
 * Zapíše partnerský kód. První vyhrává.
 *
 * Kdyby přepisoval poslední, stačilo by klientovi projít cizí odkaz den
 * před registrací a provize by patřila někomu, kdo s tím neměl nic
 * společného. Pravidlo, které je předem jasné, je lepší než dohadování
 * zpětně.
 */
export function ulozRef(kod: string): void {
  if (typeof window === "undefined" || !kod) return;
  try {
    if (localStorage.getItem(KLIC_REF)) return;
    const zaznam: UlozenyRef = { kod, kdy: new Date().toISOString() };
    localStorage.setItem(KLIC_REF, JSON.stringify(zaznam));
  } catch {
    // Soukromé okno — doporučení se prostě nezapočítá.
  }
}

/** Je uložený kód ještě v platnosti? Čistá funkce kvůli testům. */
export function refJeStalePlatny(kdy: string, ted: Date, platnostDni: number): boolean {
  const zacatek = new Date(kdy).getTime();
  if (Number.isNaN(zacatek)) return false;
  const uplynulo = ted.getTime() - zacatek;
  return uplynulo >= 0 && uplynulo <= platnostDni * 24 * 60 * 60 * 1000;
}

/** Platný partnerský kód, nebo `null`. */
export function platnyRef(platnostDni: number, ted = new Date()): string | null {
  if (typeof window === "undefined") return null;
  try {
    const ulozeny = localStorage.getItem(KLIC_REF);
    if (!ulozeny) return null;
    const zaznam = JSON.parse(ulozeny) as UlozenyRef;
    if (!zaznam.kod || !refJeStalePlatny(zaznam.kdy, ted, platnostDni)) return null;
    return zaznam.kod;
  } catch {
    return null;
  }
}
