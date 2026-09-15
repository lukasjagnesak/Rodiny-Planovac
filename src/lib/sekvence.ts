/**
 * E-mailové sekvence pro kontakty z webu.
 *
 * Kdo si stáhne vzor dohody, je v půlce nejtěžšího roku svého života
 * a řeší papír. Aplikaci v tu chvíli neřeší — ale za pár týdnů, až
 * dohodu podepíše, začne řešit provoz, na který ta dohoda nestačí.
 * Sekvence je tu od toho, aby si v tu chvíli vzpomněl.
 *
 * Tenhle soubor je jen rozhodování: co komu a kdy. Samotné odesílání
 * a zápis do databáze jsou v `sekvence-odesilani.ts`, aby se tahle část
 * dala otestovat bez pošty a bez databáze.
 *
 * Přidat krok znamená dopsat položku do `kroky`. Nic dalšího se nemění;
 * rozeslané kroky se poznají podle klíče, takže nový krok dostanou
 * i lidé, kteří v sekvenci už jsou.
 */

import type { Zprava } from "./mail-sablony";

export interface VstupSablony {
  /** Odkaz, kterým se člověk odhlásí. Patří do každé zprávy. */
  odhlaseni: string;
  /** Adresa webu bez lomítka na konci. */
  web: string;
}

export interface KrokSekvence {
  /** Klíč do databáze. Nikdy neměnit — podle něj se pozná, co už odešlo. */
  klic: string;
  /** Za jak dlouho od přihlášení se posílá. */
  poHodinach: number;
  zprava: (vstup: VstupSablony) => Zprava;
}

export interface Sekvence {
  klic: string;
  /** Za které materiály se spouští. */
  magnety: string[];
  kroky: KrokSekvence[];
}

/**
 * Kontakty starší než tohle do sekvence nevstupují.
 *
 * Bez toho by v den nasazení dostali „děkujeme za stažení" všichni, kdo
 * si kdy něco stáhli — včetně lidí, kteří tu byli před půl rokem. Takový
 * e-mail nedává smysl a je to nejrychlejší cesta k nahlášení spamu.
 */
export const NEJSTARSI_DNY = 14;

const HODINA = 60 * 60 * 1000;
const DEN = 24 * HODINA;

/**
 * Vybere jeden krok k odeslání.
 *
 * Schválně jeden, ne všechny splatné. Kdo přijde po delší pauze nebo se
 * pokazí cron, má jinak ve schránce naráz tři zprávy od někoho, komu dal
 * e-mail kvůli jednomu PDF. Zbylé kroky dojdou při dalších bězích.
 */
export function krokKOdeslani(
  sekvence: Sekvence,
  prihlaseno: Date,
  ted: Date,
  jizPoslane: string[],
): KrokSekvence | null {
  const uplynulo = ted.getTime() - prihlaseno.getTime();
  if (uplynulo < 0) return null;

  const hotove = new Set(jizPoslane);

  // V pořadí definice: nejdřív se doručí to, co mělo přijít dřív.
  for (const krok of sekvence.kroky) {
    if (hotove.has(krok.klic)) continue;
    if (uplynulo >= krok.poHodinach * HODINA) return krok;
    // Další kroky jsou ještě dál v čase, nemá smysl je zkoušet.
    return null;
  }
  return null;
}

/** Je kontakt dost čerstvý na to, aby ho sekvence oslovila? */
export function jeVOkne(prihlaseno: Date, ted: Date, nejstarsiDny = NEJSTARSI_DNY): boolean {
  const stari = ted.getTime() - prihlaseno.getTime();
  return stari >= 0 && stari <= nejstarsiDny * DEN;
}

/** Která sekvence patří k tomuhle materiálu. `null` = žádná. */
export function sekvenceProMagnet(magnet: string, sekvence: Sekvence[]): Sekvence | null {
  return sekvence.find((s) => s.magnety.includes(magnet)) ?? null;
}
