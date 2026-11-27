/**
 * Chybové hlášky: české projdou, technické anglické nahradí věta ze
 * slovníku značky. Spouští se přes `npm run test:hlasky`.
 */
const { hlaskaChyby, NEULOZENO } = require("../.test-build/format.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

ok("česká hláška z databáze projde", hlaskaChyby({ message: "Dárek už si zamluvil(a) Jana." }) === "Dárek už si zamluvil(a) Jana.");
ok("technická anglická → slovník", hlaskaChyby({ message: 'duplicate key value violates "x"' }) === NEULOZENO);
ok("prázdná → slovník", hlaskaChyby({ message: "" }) === NEULOZENO);
ok("RLS → zamčený zápis", hlaskaChyby({ code: "42501", message: "x" }).startsWith("Zápis je zamčený"));
ok("bez sítě", hlaskaChyby({ message: "Failed to fetch" }).startsWith("Nejsme online"));
ok("věta ze slovníku vyká", NEULOZENO.includes("Vaše údaje zůstaly vyplněné"));

if (selhalo) {
  console.error(`\n${selhalo} selhalo`);
  process.exit(1);
}
console.log("\nVše v pořádku.");
