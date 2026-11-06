/** Kód výpisu. Spouští se přes `npm run test:kod-vypisu`. */
const { novyKod, normalizujKod, ABECEDA_KODU } = require("../.test-build/lib/kod-vypisu.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const kod = novyKod();
ok(`tvar XXXX-XXXX (${kod})`, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(kod));
ok("bez 0, O, 1, I, L", !/[01OIL]/.test(kod));
ok("pokaždé jiný", new Set(Array.from({ length: 200 }, () => novyKod())).size === 200);
ok("deterministický z bajtů", novyKod(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7])) === "2345-6789");
ok("abeceda 31 znaků", ABECEDA_KODU.length === 31);
ok("malá písmena a mezery", normalizujKod(" k7f3 9qx2 ") === "K7F3-9QX2");
ok("bez pomlčky", normalizujKod("K7F39QX2") === "K7F3-9QX2");
ok("O se nepřijme", normalizujKod("K7F3-9QO2") === null);
ok("krátký neplatný", normalizujKod("K7F3") === null);
ok("cizí znaky neplatné", normalizujKod("K7F3-9Q!2") === null);

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
