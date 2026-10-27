/**
 * Měřicí skripty Googlu a Mety smí běžet jen na veřejném webu.
 *
 * Každá stránka ve skupinách (web), (reklama) a (auth) má být na seznamu
 * `CESTY_S_MERENIM` — jinak by z ní reklama neviděla konverze. A žádná
 * jiná na něm být nesmí: aplikace, průvodce, pozvánka i partnerský
 * přehled pracují s daty rodiny.
 *
 * Spouští se přes `npm run test:mereni-hranice`.
 */
const fs = require("node:fs");
const path = require("node:path");
const { smiMerit } = require("../.test-build/lib/mereni-hranice.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

/** Adresy všech `page.tsx` pod složkou, se skupinou, ve které leží. */
function stranky(slozka, cesta = "", skupina = null, nalezene = []) {
  for (const polozka of fs.readdirSync(slozka, { withFileTypes: true })) {
    const dal = path.join(slozka, polozka.name);
    if (polozka.isDirectory()) {
      if (polozka.name === "api") continue;
      const jeSkupina = polozka.name.startsWith("(");
      const kus = jeSkupina ? "" : polozka.name.startsWith("[") ? "/libovolne" : `/${polozka.name}`;
      stranky(dal, cesta + kus, jeSkupina ? polozka.name : skupina, nalezene);
    } else if (polozka.name === "page.tsx") {
      nalezene.push({ cesta: cesta || "/", skupina });
    }
  }
  return nalezene;
}

const VEREJNE = new Set(["(web)", "(reklama)", "(auth)"]);
const vsechny = stranky(path.join(__dirname, "..", "src/app"));
ok(`stránky se našly (${vsechny.length})`, vsechny.length > 30);

console.log("── veřejný web měří ──");
for (const s of vsechny.filter((s) => VEREJNE.has(s.skupina))) ok(s.cesta, smiMerit(s.cesta));

console.log("── nic jiného ne ──");
const ostatni = vsechny.filter((s) => !VEREJNE.has(s.skupina));
ok("mezi nimi je kalendář i průvodce", ostatni.some((s) => s.cesta === "/kalendar") && ostatni.some((s) => s.cesta === "/vitejte"));
for (const s of ostatni) ok(`${s.cesta} ${s.skupina ?? ""}`.trim(), !smiMerit(s.cesta));

console.log("── předpony nepřetékají ──");
ok("/kalkulacka/abc ano", smiMerit("/kalkulacka/abc"));
ok("/kalkulackax ne", !smiMerit("/kalkulackax"));
ok("/prehled ne, i když „/\" je na seznamu", !smiMerit("/prehled"));

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
