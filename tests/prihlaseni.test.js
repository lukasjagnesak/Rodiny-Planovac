/**
 * Zapínání cizích přihlášení.
 *
 * Tady se hlídá jedna jediná věc, ale ta je drahá: tlačítko, za kterým
 * nic není. Když se čtení proměnné rozjede, ukáže se na přihlašovací
 * stránce Google, klik skončí hláškou `provider is not enabled` a člověk
 * se do aplikace nedostane — přesně to se v ostrém provozu stalo.
 *
 * Spouští se přes `npm run test:prihlaseni`.
 */
const { zapnuto, jsouCiziPrihlaseni } = require("../.test-build/zpusoby-prihlaseni.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

console.log("── co znamená zapnuto ──");
ok("1 zapíná", zapnuto("1") === true);
ok("true zapíná", zapnuto("true") === true);
ok("ano zapíná", zapnuto("ano") === true);
ok("nezáleží na velikosti písmen", zapnuto("TRUE") === true);
ok("mezery kolem nevadí", zapnuto("  1  ") === true);

console.log("── a co ne ──");
ok("chybějící proměnná je vypnuto", zapnuto(undefined) === false);
ok("null je vypnuto", zapnuto(null) === false);
ok("prázdná hodnota je vypnuto", zapnuto("") === false);
ok("samá mezera je vypnuto", zapnuto("   ") === false);
ok("0 je vypnuto", zapnuto("0") === false);
ok("false je vypnuto", zapnuto("false") === false);
ok("ne je vypnuto", zapnuto("ne") === false);
// Kdo řádek v .env jen odkomentuje a nechá tam poznámku, nesmí si
// omylem rozsvítit tlačítko k něčemu, co nemá nastavené.
ok("cokoli jiného je vypnuto", zapnuto("zatím ne") === false);

console.log("── kdy se kreslí blok s dělicí čarou ──");
ok("nic zapnutého = nekreslí se", jsouCiziPrihlaseni(false, false) === false);
ok("samotný Google stačí", jsouCiziPrihlaseni(true, false) === true);
ok("samotný Apple stačí", jsouCiziPrihlaseni(false, true) === true);
ok("oba taky", jsouCiziPrihlaseni(true, true) === true);

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
