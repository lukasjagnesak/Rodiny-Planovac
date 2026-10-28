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
 * Druhá polovina hlídá totéž u koncových bodů. Stránka se aspoň pozná
 * tím, že místo ní naskočí přihlášení; volání z prohlížeče dostane
 * přesměrování, po něm přihlašovací stránku v HTML, a formulář jen
 * řekne „odeslání se nepovedlo". Takhle spadlo odesílání PDF z
 * kalkulačky výživného — na stránce, na kterou vede placená kampaň.
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

/**
 * Každá stránka ve veřejných skupinách.
 *
 * Mapa webu nestačí: vstupní stránka z reklamy v ní schválně není (nemá
 * se indexovat), a přesto ji musí vidět každý, za jehož proklik se
 * zaplatilo. Kdyby ji proxy poslala na přihlášení, reklama by platila za
 * přihlašovací formulář.
 */
const VEREJNE_SKUPINY = ["src/app/(web)", "src/app/(reklama)"];

function strankySkupiny(slozka, cesta = "", nalezene = []) {
  const cela = path.join(__dirname, "..", slozka);
  if (!fs.existsSync(cela)) return nalezene;
  for (const polozka of fs.readdirSync(cela, { withFileTypes: true })) {
    if (polozka.isDirectory()) {
      // Skupiny (v závorkách) se do adresy nepromítají; [slug] je libovolný kus.
      const kus = polozka.name.startsWith("(")
        ? ""
        : polozka.name.startsWith("[")
          ? "/libovolne"
          : `/${polozka.name}`;
      strankySkupiny(path.join(slozka, polozka.name), cesta + kus, nalezene);
    } else if (polozka.name === "page.tsx") {
      nalezene.push(cesta || "/");
    }
  }
  return nalezene;
}

console.log("── každá stránka ve veřejných skupinách je veřejná ──");
const vsechnyStranky = VEREJNE_SKUPINY.flatMap((s) => strankySkupiny(s));
ok(`stránky se našly (${vsechnyStranky.length})`, vsechnyStranky.length > 10);
for (const cesta of vsechnyStranky.sort()) {
  const kryta = verejne.some((v) => cesta === v || (v !== "/" && cesta.startsWith(`${v}/`)));
  ok(cesta, kryta);
}

/**
 * Koncové body, na které sahá veřejný web.
 *
 * Hledají se doslovná volání `fetch("/api/…")` v komponentách, které
 * běží před přihlášením. Nic se nevyjmenovává ručně schválně — ruční
 * seznam by se zapomněl doplnit úplně stejně jako `PUBLIC_PATHS`.
 */
const VEREJNE_SLOZKY = [
  "src/app/(web)",
  "src/app/(reklama)",
  "src/components/web",
  "src/components/kalkulacka",
];

function projdi(slozka, nalezene = []) {
  const cela = path.join(__dirname, "..", slozka);
  if (!fs.existsSync(cela)) return nalezene;
  for (const polozka of fs.readdirSync(cela, { withFileTypes: true })) {
    const dal = path.join(slozka, polozka.name);
    if (polozka.isDirectory()) projdi(dal, nalezene);
    else if (/\.tsx?$/.test(polozka.name)) nalezene.push(dal);
  }
  return nalezene;
}

const volana = new Set();
for (const soubor of VEREJNE_SLOZKY.flatMap((s) => projdi(s))) {
  for (const m of precti(soubor).matchAll(/fetch\(\s*"(\/api\/[^"?]+)"/g)) {
    volana.add(m[1]);
  }
}

console.log("── koncové body veřejného webu jsou veřejné ──");
ok(`nějaká volání se vůbec našla (${volana.size})`, volana.size > 0);
for (const cesta of [...volana].sort()) {
  const kryta = verejne.some((v) => cesta === v || cesta.startsWith(`${v}/`));
  ok(cesta, kryta);
}

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
