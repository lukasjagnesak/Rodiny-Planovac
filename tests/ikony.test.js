/**
 * Ikony Klidoo: všechno, na co se odkazuje, v sadě existuje, a sada
 * drží pravidla (lib/ikony.ts). Spouští se přes `npm run test:ikony`.
 */
const fs = require("node:fs");
const path = require("node:path");
const { IKONY, NAZVY_IKON, svgIkony } = require("../.test-build/lib/ikony.js");
const { EVENT_KINDS, EXPENSE_CATEGORIES, KONTAKT_DRUHY, DOKLAD_DRUHY } = require("../.test-build/lib/constants.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

console.log("── odkazy v konstantách ──");
for (const [jmeno, mapa] of Object.entries({ EVENT_KINDS, EXPENSE_CATEGORIES, KONTAKT_DRUHY, DOKLAD_DRUHY })) {
  for (const [klic, m] of Object.entries(mapa)) ok(`${jmeno}.${klic} → ${m.ikona}`, m.ikona in IKONY);
}

console.log("── barvy jen z palety Klidoo ──");
const { BARVY_IKON } = require("../.test-build/lib/barvy.js");
const { EDUPAGE_DRUHY } = require("../.test-build/lib/constants.js");
const povolene = new Set(Object.values(BARVY_IKON));
for (const [jmeno, mapa] of Object.entries({ EVENT_KINDS, EXPENSE_CATEGORIES, KONTAKT_DRUHY, EDUPAGE_DRUHY })) {
  for (const [klic, m] of Object.entries(mapa)) ok(`${jmeno}.${klic}: ${m.color}`, povolene.has(m.color));
}

console.log("── pravidla sady ──");
for (const n of NAZVY_IKON) {
  const s = IKONY[n];
  const otevrene = (s.match(/<(path|circle|rect|line|polyline|polygon|ellipse)\b/g) ?? []).length;
  const zavrene = (s.match(/\/>/g) ?? []).length;
  ok(`${n}: prvky uzavřené`, otevrene > 0 && otevrene === zavrene);
  ok(`${n}: bez vlastní tloušťky a barvy čáry`, !/stroke-width|stroke="#|fill="#/.test(s));
  ok(`${n}: bez textu a skriptu`, !/<text|<script|on\w+=/.test(s));
}
for (const n of NAZVY_IKON) {
  const push = path.join(__dirname, "..", "public", "ikony", "push");
  ok(`${n}: PNG pro notifikace (npm run ikony)`, fs.existsSync(path.join(push, `${n}.png`)) && fs.existsSync(path.join(push, `${n}-odznak.png`)));
}
ok("svgIkony skládá platný obal", /^<svg [^>]*viewBox="0 0 24 24"[^>]*>.*<\/svg>$/.test(svgIkony("lekar")));

console.log("── v aplikaci nezůstala emoji ──");
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
function projdi(slozka, vysledek = []) {
  for (const p of fs.readdirSync(slozka, { withFileTypes: true })) {
    const cela = path.join(slozka, p.name);
    if (p.isDirectory()) projdi(cela, vysledek);
    else if (/\.(ts|tsx)$/.test(p.name)) vysledek.push(cela);
  }
  return vysledek;
}
const koren = path.join(__dirname, "..", "src");
// Články jsou text, ne rozhraní; docx kreslí zaškrtávací políčko znakem ☐ schválně.
const VYJIMKY = [path.join("src", "obsah"), path.join("src", "lib", "docx.ts")];
const sEmoji = projdi(koren)
  .map((p) => path.relative(path.join(__dirname, ".."), p))
  .filter((p) => !VYJIMKY.some((v) => p.startsWith(v)))
  .filter((p) => EMOJI.test(fs.readFileSync(path.join(__dirname, "..", p), "utf8")));
ok(`žádný soubor s emoji${sEmoji.length ? ": " + sEmoji.join(", ") : ""}`, sEmoji.length === 0);

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
