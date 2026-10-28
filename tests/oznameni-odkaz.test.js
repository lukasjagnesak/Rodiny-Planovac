/**
 * Kam vede kliknutí na push notifikaci.
 *
 * Bere se z prefixu `dedupe_key`, protože ten se vždycky nastavuje při
 * plánování (planNotifications) — přidat druhou pravdu (sloupec s odkazem,
 * který musí zůstat v souladu) by byl zbytečný krok navíc.
 *
 * Spouští se přes `npm run test:oznameni-odkaz`.
 */
const { odkazPodleDeduplikace, ikonaPodleDeduplikace } = require("../.test-build/oznameni-odkaz.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

ok("událost vede na /udalosti", odkazPodleDeduplikace("event:abc:60") === "/udalosti");
ok("odvoz vede na /krouzky", odkazPodleDeduplikace("ride:abc:2026-04-10:tam") === "/krouzky");
ok(
  "chybějící řidič taky na /krouzky",
  odkazPodleDeduplikace("ride-missing:abc:2026-04-10") === "/krouzky",
);
ok("předání vede na /kalendar", odkazPodleDeduplikace("handover:f1:2026-04-10") === "/kalendar");
ok("zpráva bez dedupe_key spadne na /oznameni", odkazPodleDeduplikace(null) === "/oznameni");
ok("neznámý prefix taky na /oznameni", odkazPodleDeduplikace("cosi:1") === "/oznameni");
ok("undefined se chová jako null", odkazPodleDeduplikace(undefined) === "/oznameni");

console.log("── ikona notifikace ──");
ok("událost podle typu", ikonaPodleDeduplikace("event:abc:60", "lekar") === "lekar");
ok("událost bez typu: zvonek", ikonaPodleDeduplikace("event:abc:60") === "zvonek");
ok("odvoz: auto", ikonaPodleDeduplikace("ride:a:2026-11-01:there") === "auto");
ok("chybí řidič: otazník", ikonaPodleDeduplikace("ride-missing:a:2026-11-01") === "otaznik");
ok("předání: šipky", ikonaPodleDeduplikace("handover:f:2026-11-01") === "predani");
ok("neznámé: zvonek", ikonaPodleDeduplikace(null) === "zvonek");

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\nSelhalo: ${selhalo}`);
process.exit(selhalo === 0 ? 0 : 1);
