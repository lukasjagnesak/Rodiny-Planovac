/**
 * Každá událost, kterou aplikace posílá, ji server taky zapíše.
 *
 * `/api/t` přijímá jen druhy z `DRUHY` v `lib/provoz.ts` a ostatní tiše
 * zahodí. Takhle se týdny nezapisovalo osm druhů z patnácti — včetně
 * kliknutí na „Vyzkoušet zdarma" pod kalkulačkou výživného — a v datech
 * z toho byla nula, která vypadala jako chování lidí, ne jako chyba.
 *
 * Seznam se čte z textu souboru, ne přes import: `provoz.ts` táhne
 * Supabase a `server-only`, a kvůli jednomu poli řetězců to nestojí za to.
 *
 * Spouští se přes `npm run test:mereni-druhy`.
 */
const fs = require("node:fs");
const path = require("node:path");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const koren = path.join(__dirname, "..");
const provoz = fs.readFileSync(path.join(koren, "src/lib/provoz.ts"), "utf8");
const blok = provoz.match(/export const DRUHY = \[([\s\S]*?)\] as const;/);
const prijme = new Set([...(blok?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]));

function projdi(slozka, nalezene = []) {
  for (const polozka of fs.readdirSync(slozka, { withFileTypes: true })) {
    const cela = path.join(slozka, polozka.name);
    if (polozka.isDirectory()) projdi(cela, nalezene);
    else if (/\.tsx?$/.test(polozka.name)) nalezene.push(cela);
  }
  return nalezene;
}

const posila = new Map();
for (const soubor of projdi(path.join(koren, "src"))) {
  const text = fs.readFileSync(soubor, "utf8");
  // Jen skutečné názvy událostí — v komentářích se `zmer("…")` objevuje
  // jako ukázka a do seznamu nepatří.
  for (const m of text.matchAll(/\bzmer\(\s*"([a-z0-9_-]+)"/g)) {
    if (!posila.has(m[1])) posila.set(m[1], path.relative(koren, soubor));
  }
}

console.log("── seznamy se našly ──");
ok(`server má seznam (${prijme.size} druhů)`, prijme.size >= 7);
ok(`aplikace nějaké události posílá (${posila.size} druhů)`, posila.size >= 7);

console.log("── co aplikace pošle, server zapíše ──");
for (const [druh, kde] of [...posila].sort()) {
  ok(`${druh}  (${kde})`, prijme.has(druh));
}

console.log("── a nic nezapisuje navíc ──");
// Druh, který nikdo neposílá, je buď pozůstatek, nebo překlep v kódu,
// který měl událost posílat. Obojí je dobré vědět.
for (const druh of [...prijme].sort()) {
  ok(`${druh} někde v aplikaci vzniká`, posila.has(druh) || druh === "zobrazeni");
}

console.log("── délka se vejde do databáze ──");
for (const druh of prijme) {
  ok(`${druh}: 3–40 znaků`, druh.length >= 3 && druh.length <= 40);
}

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
