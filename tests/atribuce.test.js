/**
 * Odkud návštěvník přišel — hlavně jestli z placené reklamy.
 *
 * Google Ads označuje prokliky `gclid`, ne `utm_*`. Dokud jsme ho
 * nečetli, placená návštěva se v měření tvářila jako přímá a nedalo se
 * říct, kolik lidí reklama přivedla a co na webu udělali.
 *
 * Spouští se přes `npm run test:atribuce`.
 */
const { kanalZAdresy } = require("../.test-build/lib/atribuce.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}
const k = (dotaz) => kanalZAdresy(new URLSearchParams(dotaz));

console.log("── proklik z Google Ads ──");
ok("gclid je placená návštěva z Googlu", k("gclid=abc").utm_source === "google" && k("gclid=abc").utm_medium === "cpc");
ok("gbraid taky (iPhone)", k("gbraid=abc").utm_medium === "cpc");
ok("wbraid taky", k("wbraid=abc").utm_medium === "cpc");

console.log("── vlastní označení má přednost ──");
const vlastni = k("gclid=abc&utm_source=google&utm_medium=cpc&utm_campaign=123");
ok("kampaň z utm zůstane", vlastni.utm_campaign === "123");
ok("zdroj z utm zůstane", k("gclid=abc&utm_source=seznam").utm_source === "seznam");

console.log("── co placené není ──");
ok("bez parametrů nic", k("").utm_source === "" && k("").utm_medium === "");
ok("fbclid není reklama — Facebook ho dává ke všemu", k("fbclid=abc").utm_medium === "");
ok("partnerský kód není reklama", k("ref=novakova").utm_medium === "");

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
