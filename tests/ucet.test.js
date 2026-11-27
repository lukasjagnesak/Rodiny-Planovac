/**
 * Číslo účtu a QR Platba.
 *
 * Spouští se přes `npm run test:ucet`.
 */
const { normalizujUcet, formatUcet, ibanPlatny, spayd } = require("../.test-build/lib/ucet.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

// Účet Nadace rozvoje občanské společnosti z ukázek ČNB: 19-2000145399/0800
const a = normalizujUcet("19-2000145399/0800");
ok("český účet s předčíslím → IBAN", a.iban === "CZ6508000000192000145399");
ok("a zpátky", formatUcet(a.iban) === "19-2000145399/0800");
ok("mezery nevadí", normalizujUcet(" 19-2000145399 / 0800 ").iban === a.iban);
ok("IBAN s mezerami", normalizujUcet("CZ65 0800 0000 1920 0014 5399").iban === a.iban);
ok("překlep v čísle se pozná", "chyba" in normalizujUcet("19-2000145398/0800"));
ok("špatný IBAN se pozná", "chyba" in normalizujUcet("CZ6508000000192000145398"));
ok("nesmysl", "chyba" in normalizujUcet("abc"));
ok("prázdné", "chyba" in normalizujUcet(""));
ok("slovenský IBAN projde", ibanPlatny("SK3112000000198742637541"));
ok("cizí IBAN po čtveřicích", formatUcet("SK3112000000198742637541") === "SK31 1200 0000 1987 4263 7541");

const qr = spayd({ iban: a.iban, castka: 945, mena: "czk", zprava: "Klidoo: Zimní bunda *23. 10.*" });
ok("SPAYD hlavička a účet", qr.startsWith("SPD*1.0*ACC:CZ6508000000192000145399*"));
ok("částka na haléře", qr.includes("*AM:945.00*"));
ok("měna velkými", qr.includes("*CC:CZK"));
ok("zpráva bez diakritiky a hvězdiček", qr.endsWith("*MSG:Klidoo: Zimni bunda 23. 10."));
ok(
  "zpráva nejvýš 60 znaků",
  spayd({ iban: a.iban, castka: 1, mena: "CZK", zprava: "x".repeat(100) }).split("MSG:")[1].length === 60,
);

if (selhalo) {
  console.error(`\n${selhalo} selhalo`);
  process.exit(1);
}
console.log("\nVše v pořádku.");
