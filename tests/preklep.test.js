// Návrh opravy překlepu v doméně e-mailu při registraci.
const assert = require("assert");
const { navrhOpravy } = require("../.test-build/lib/preklep-emailu.js");
const pripady = [
  ["jana@gmai.com", "jana@gmail.com"],
  ["jana@gmial.com", "jana@gmail.com"],
  ["jana@gmail.cz", "jana@gmail.com"],
  ["jana@seznam.cy", "jana@seznam.cz"],
  ["jana@sezam.cz", "jana@seznam.cz"],
  ["jana@outlok.com", "jana@outlook.com"],
  ["Jana@Gmai.com", "jana@gmail.com"],
  ["jana@gmail.com", null],
  ["jana@seznam.cz", null],
  ["jana@firma.cz", null],
  ["jana@klidoo.cz", null],
  ["jana", null],
];
let chyb = 0;
for (const [vstup, cekam] of pripady) {
  const v = navrhOpravy(vstup);
  const ok = v === cekam;
  if (!ok) chyb++;
  console.log((ok ? "  ✓ " : "  ✗ ") + `${vstup} → ${v}`);
}
if (chyb) process.exit(1);
console.log("Všechno prošlo.");
