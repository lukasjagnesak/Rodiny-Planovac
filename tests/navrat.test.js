/**
 * Kam se smí člověk po přihlášení vrátit.
 *
 * Cíl chodí v adrese, takže ho umí nastavit kdokoli. Kdyby prošla cizí
 * doména, dal by se odkaz na naše přihlášení poslat komukoli a skončil
 * by jinde — s tím, že cestou přes klidoo.cz to vypadá důvěryhodně.
 *
 * Spouští se přes `npm run test:navrat`.
 */
const { bezpecnyCil, odkazNaPrihlaseni } = require("../.test-build/lib/navrat.js");
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
console.log("── odložený výpočet přežije přihlášení ──");
// Přesně tohle bylo rozbité: adresa se klonovala i s dotazem, do `dal`
// šla holá cesta — token zůstal viset na přihlašovací stránce jako cizí
// parametr a po přihlášení už ho nikdo nehledal.
const cil = odkazNaPrihlaseni(new URL("https://klidoo.cz/vitejte?vyzivne=ABC123"));
ok("posílá na přihlášení", cil.pathname === "/prihlaseni");
ok("token je v `dal`", cil.searchParams.get("dal") === "/vitejte?vyzivne=ABC123");
ok("a nikde jinde nezůstal", cil.searchParams.get("vyzivne") === null);
ok("v adrese je jediný parametr", [...cil.searchParams.keys()].length === 1);

const holy = odkazNaPrihlaseni(new URL("https://klidoo.cz/prehled"));
ok("cesta bez dotazu projde beze změny", holy.searchParams.get("dal") === "/prehled");

const vic = odkazNaPrihlaseni(new URL("https://klidoo.cz/vydaje?m=2026-09&novy=2026-09-01"));
ok(
  "víc parametrů se nese celých",
  vic.searchParams.get("dal") === "/vydaje?m=2026-09&novy=2026-09-01",
);

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
