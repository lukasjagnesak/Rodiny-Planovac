/**
 * Každá stránka v mapě webu musí být veřejná.
 *
 * Nová stránka na webu se založí, odkáže z menu, přidá do mapy — a na
 * `PUBLIC_PATHS` v proxy se zapomene. Výsledek nevypadá jako chyba:
 * stránka funguje, dokud je člověk odhlášený… ne, přesně naopak. Bez
 * přihlášení se přesměruje na přihlašovací formulář, takže ji nevidí ani
 * návštěvník z vyhledávače, ani robot. Přitom v mapě webu je a Google na
 * ni posílá crawlera.
 *
 * Přesně tohle se stalo sekci článků, proto tenhle test existuje.
 *
 * Spouští se přes `npm run test:verejne-cesty`.
 */
const fs = require("node:fs");
const path = require("node:path");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

/**
 * Čte se to z textu souborů, ne přes import.
 *
 * `proxy.ts` táhne půlku Nextu a Supabase, `sitemap.ts` typy z Nextu —
 * překládat obojí kvůli dvěma seznamům řetězců by test zdražilo víc,
 * než je zdrávo. Cesty jsou v obou souborech zapsané doslova.
 */
function precti(soubor) {
  return fs.readFileSync(path.join(__dirname, "..", soubor), "utf8");
}

const proxy = precti("src/proxy.ts");
const sitemap = precti("src/app/sitemap.ts");

const blokVerejnych = proxy.match(/PUBLIC_PATHS = \[([\s\S]*?)\n\];/);
const verejne = [...(blokVerejnych?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);

const blokStranek = sitemap.match(/const STRANKY[\s\S]*?\n\];/);
const stranky = [...(blokStranek?.[0] ?? "").matchAll(/cesta: "([^"]+)"/g)].map((m) => m[1]);

console.log("── seznamy se vůbec našly ──");
ok(`veřejných cest je víc než deset (${verejne.length})`, verejne.length > 10);
ok(`stránek v mapě je víc než pět (${stranky.length})`, stranky.length > 5);

console.log("── každá stránka z mapy je veřejná ──");
for (const cesta of stranky) {
  const kryta = verejne.some((v) => cesta === v || cesta.startsWith(`${v}/`));
  ok(cesta, kryta);
}

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
