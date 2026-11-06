/**
 * Bankovní účet a QR Platba.
 *
 * Účet se ukládá jako IBAN — jednoznačný a QR Platba ho stejně chce.
 * Rodič ale píše český tvar `19-123456789/0800`, takže se převádí tam
 * i zpátky. Kontrolní součty (český modulo 11 i IBAN modulo 97) chytí
 * překlep v číslici dřív, než druhý rodič pošle peníze jinam.
 *
 * QR Platba (SPAYD) je standard České bankovní asociace; načte ho
 * mobilní bankovnictví všech českých bank.
 */

const VAHY = [6, 3, 7, 9, 10, 5, 8, 4, 2, 1];

function mod11(cislice: string): boolean {
  const s = cislice.padStart(10, "0");
  let soucet = 0;
  for (let i = 0; i < 10; i++) soucet += Number(s[i]) * VAHY[i];
  return soucet % 11 === 0;
}

/** Zbytek po dělení 97 pro IBAN (s písmeny převedenými na čísla). */
function mod97(iban: string): number {
  const preskladany = iban.slice(4) + iban.slice(0, 4);
  let zbytek = 0;
  for (const z of preskladany) {
    const hodnota = /[A-Z]/.test(z) ? String(z.charCodeAt(0) - 55) : z;
    for (const c of hodnota) zbytek = (zbytek * 10 + Number(c)) % 97;
  }
  return zbytek;
}

export function ibanPlatny(iban: string): boolean {
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban) && mod97(iban) === 1;
}

export type VysledekUctu = { iban: string } | { chyba: string };

/**
 * Přečte účet v českém tvaru (předčíslí-číslo/kód banky) nebo jako IBAN.
 * Mezery nevadí.
 */
export function normalizujUcet(vstup: string): VysledekUctu {
  const s = vstup.replace(/\s+/g, "").toUpperCase();
  if (!s) return { chyba: "Zadejte číslo účtu." };

  if (/^[A-Z]{2}/.test(s)) {
    return ibanPlatny(s) ? { iban: s } : { chyba: "IBAN nesedí. Zkontrolujte ho prosím." };
  }

  const m = /^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/.exec(s);
  if (!m) return { chyba: "Číslo účtu pište ve tvaru 123456789/0800 nebo 19-123456789/0800." };
  const [, predcisli = "", cislo, banka] = m;
  if (!mod11(predcisli) || !mod11(cislo)) {
    return { chyba: "Číslo účtu nesedí, nejspíš je v něm překlep." };
  }
  const bban = banka + predcisli.padStart(6, "0") + cislo.padStart(10, "0");
  const kontrola = 98 - mod97(`CZ00${bban}`);
  return { iban: `CZ${String(kontrola).padStart(2, "0")}${bban}` };
}

/** Účet k zobrazení: český tvar u českých účtů, jinak IBAN po čtveřicích. */
export function formatUcet(iban: string): string {
  if (/^CZ\d{22}$/.test(iban)) {
    const banka = iban.slice(4, 8);
    const predcisli = iban.slice(8, 14).replace(/^0+/, "");
    const cislo = iban.slice(14).replace(/^0+/, "");
    return `${predcisli ? `${predcisli}-` : ""}${cislo}/${banka}`;
  }
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

/** Zpráva pro příjemce: bez diakritiky a hvězdiček, nejvýš 60 znaků. */
function zpravaProSpayd(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[*\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
    .trim();
}

/** Obsah QR kódu podle standardu QR Platba (SPAYD 1.0). */
export function spayd(vstup: { iban: string; castka: number; mena: string; zprava: string }): string {
  const casti = [
    "SPD",
    "1.0",
    `ACC:${vstup.iban}`,
    `AM:${vstup.castka.toFixed(2)}`,
    `CC:${vstup.mena.toUpperCase()}`,
  ];
  const zprava = zpravaProSpayd(vstup.zprava);
  if (zprava) casti.push(`MSG:${zprava}`);
  return casti.join("*");
}
