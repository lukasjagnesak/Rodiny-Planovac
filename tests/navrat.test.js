/**
 * Kam se smí člověk po přihlášení vrátit.
 *
 * Cíl chodí v adrese, takže ho umí nastavit kdokoli. Kdyby prošla cizí
 * doména, dal by se odkaz na naše přihlášení poslat komukoli a skončil
 * by jinde — s tím, že cestou přes klidoo.cz to vypadá důvěryhodně.
 *
 * Spouští se přes `npm run test:navrat`.
 */
const { bezpecnyCil } = require("../.test-build/lib/navrat.js");
let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}
console.log("── kam se smí vrátit ──");
ok("vlastní cesta projde", bezpecnyCil("/vitejte?vyzivne=abc", "/prehled") === "/vitejte?vyzivne=abc");
ok("prázdný cíl bere výchozí", bezpecnyCil(null, "/prehled") === "/prehled");
ok("cizí web neprojde", bezpecnyCil("https://zlo.example", "/prehled") === "/prehled");
ok("dvojité lomítko je cizí web", bezpecnyCil("//zlo.example", "/prehled") === "/prehled");
ok("zpětné lomítko taky", bezpecnyCil("/\\zlo.example", "/prehled") === "/prehled");
ok("javascript: neprojde", bezpecnyCil("javascript:alert(1)", "/prehled") === "/prehled");
console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
