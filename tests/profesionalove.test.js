/**
 * Přístup pro profesionály: délka přístupu a kdy končí.
 *
 * Spouští se přes `npm run test:profesionalove`.
 */
const { pristupDo, pristupPlati, zbyvaDni, nazevProfese } = require("../.test-build/lib/profesionalove.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

ok("3 měsíce od 15. 1.", pristupDo(3, "2026-01-15") === "2026-04-15");
ok("1 měsíc od 31. 1. končí koncem února", pristupDo(1, "2026-01-31") === "2026-02-28");
ok("přestupný rok", pristupDo(1, "2028-01-31") === "2028-02-29");
ok("rok přes přelom roku", pristupDo(12, "2026-10-27") === "2027-10-27");
ok("bez data konce", pristupDo(0, "2026-10-27") === null);

ok("poslední den ještě platí", pristupPlati("2026-10-27", "2026-10-27"));
ok("den poté už ne", !pristupPlati("2026-10-26", "2026-10-27"));
ok("bez konce platí vždy", pristupPlati(null, "2030-01-01"));

ok("zbývá dnešek", zbyvaDni("2026-10-27", "2026-10-27") === 1);
ok("zbývá týden", zbyvaDni("2026-11-02", "2026-10-27") === 7);
ok("po konci nula", zbyvaDni("2026-10-01", "2026-10-27") === 0);
ok("bez konce null", zbyvaDni(null, "2026-10-27") === null);

ok("název profese", nazevProfese("ospod") === "OSPOD" && nazevProfese(null) === "Profesionál");

if (selhalo) {
  console.error(`\n${selhalo} selhalo`);
  process.exit(1);
}
console.log("\nVše v pořádku.");
