/**
 * Nápady na dárky: stavy, tlačítka a odpočet do narozenin.
 *
 * Spouští se přes `npm run test:darky`.
 */
const { stavDarku, akceDarku, popisStavu, dniDoNarozenin, budeLet } = require("../.test-build/lib/darky.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const volny = { koupi: null, koupi_jmeno: null, koupeno_at: null, darovano: false };
const muj = { ...volny, koupi: "ja", koupi_jmeno: "Petr" };
const cizi = { ...volny, koupi: "on", koupi_jmeno: "Jana" };
const koupeny = { ...muj, koupeno_at: "2026-10-30T10:00:00Z" };

ok("stavy", stavDarku(volny) === "volny" && stavDarku(muj) === "zamluveny" && stavDarku(koupeny) === "koupeny");
ok("darovaný přebije vše", stavDarku({ ...koupeny, darovano: true }) === "darovany");

const a = (d, edit = true) => akceDarku(d, "ja", edit).join(",");
ok("volný: zamluvit, upravit, smazat", a(volny) === "zamluvit,upravit,smazat");
ok("můj zamluvený: koupeno, uvolnit", a(muj) === "koupeno,uvolnit,upravit,smazat");
ok("cizí zamluvený: jen upravit, smazat ne", a(cizi) === "upravit");
ok("můj koupený: darováno", a(koupeny) === "darovano,uvolnit,upravit,smazat");
ok("jen ke čtení: nic", a(volny, false) === "");

ok("popis: kupujete vy", popisStavu(muj, "ja") === "kupujete vy");
ok("popis: koupí Jana", popisStavu(cizi, "ja") === "koupí Jana");

ok("narozeniny dnes", dniDoNarozenin("2018-10-31", "2026-10-31") === 0);
ok("narozeniny zítra", dniDoNarozenin("2018-11-01", "2026-10-31") === 1);
ok("narozeniny už byly → příští rok", dniDoNarozenin("2018-10-30", "2026-10-31") === 364);
ok("29. 2. v nepřestupném roce", dniDoNarozenin("2016-02-29", "2027-02-01") === 27);
ok("bude let", budeLet("2018-11-15", "2026-10-31") === 8 && budeLet("2018-03-01", "2026-10-31") === 9);

if (selhalo) {
  console.error(`\n${selhalo} selhalo`);
  process.exit(1);
}
console.log("\nVše v pořádku.");
