/**
 * Konzistence nabídky napříč webem, e-maily a reklamami (master brief
 * 2026, kap. 2.4 a 10.1): cena se nesmí nikde napsat ručně, a když už
 * se objeví v textu reklam, musí sedět s ceníkem.
 *
 * Spouští se přes `npm run test:konzistence`.
 */
const fs = require("fs");
const path = require("path");
const { CENIK } = require("../.test-build/lib/tarify.js");
const { BENEFITY, SOUKROMI } = require("../.test-build/lib/texty.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

function soubory(slozka, pripony) {
  const vysledek = [];
  for (const polozka of fs.readdirSync(slozka, { withFileTypes: true })) {
    const cesta = path.join(slozka, polozka.name);
    if (polozka.isDirectory()) vysledek.push(...soubory(cesta, pripony));
    else if (pripony.some((p) => polozka.name.endsWith(p))) vysledek.push(cesta);
  }
  return vysledek;
}

const ceny = new Set(CENIK.flatMap((t) => [t.cena, t.mesicne]));
// Číslo před „Kč“, i s mezerou nebo pevnou mezerou mezi tisíci.
const CENA = /(\d[\d\s ]*\d|\d)[\s ]?Kč/g;
const cislo = (text) => Number(text.replace(/[\s ]/g, ""));

// 1) Veřejné stránky a e-maily: žádná cena napsaná ručně (kromě 0 Kč).
const verejne = [
  ...soubory("src/app/(web)", [".tsx", ".ts"]),
  ...soubory("src/app/(registrace)", [".tsx", ".ts"]),
  ...soubory("src/app/(reklama)", [".tsx", ".ts"]),
  ...soubory("src/components/web", [".tsx", ".ts"]),
  "src/lib/mail-sablony.ts",
];
const rucne = [];
for (const f of verejne) {
  let vKomentari = false;
  fs.readFileSync(f, "utf8")
    .split("\n")
    .forEach((radek, i) => {
      const t = radek.trim();
      // Komentáře (i víceřádkové v JSX) píšeme vývojářům, ne zákazníkům.
      if (vKomentari) {
        if (t.includes("*/")) vKomentari = false;
        return;
      }
      if (t.startsWith("/*") || t.startsWith("{/*")) {
        if (!t.includes("*/")) vKomentari = true;
        return;
      }
      if (t.startsWith("//") || t.startsWith("*")) return;
      for (const m of t.matchAll(CENA)) {
        if (cislo(m[1]) >= 100) rucne.push(`${f}:${i + 1} „${m[0].trim()}“`);
      }
    });
}
ok("veřejné stránky a e-maily berou ceny z tarify.ts", rucne.length === 0);
for (const r of rucne) console.log("      " + r);

// 2) Texty reklam v dokumentaci: každá cena nad 100 Kč musí být z ceníku.
const reklamy = ["docs/google-ads.md", "docs/facebook-ads.md"].filter((f) => fs.existsSync(f));
const spatne = [];
for (const f of reklamy) {
  for (const radek of fs.readFileSync(f, "utf8").split("\n")) {
    // Rozpočty a výsledky kampaní nejsou cena pro zákazníka.
    if (/rozpo[čc]et|\/den|denně|Za ~|Za prvních|Start\b/i.test(radek)) continue;
    for (const m of radek.matchAll(CENA)) {
      if (cislo(m[1]) >= 100 && !ceny.has(cislo(m[1]))) spatne.push(`${f}: „${m[0]}“`);
    }
  }
}
ok("reklamní texty uvádějí jen ceny z ceníku", spatne.length === 0);
for (const r of spatne) console.log("      " + r);

// 3) Slovník: rozhodnutá formulace a vykání.
ok("benefity: školní akce a rozvrhy", BENEFITY.some((b) => b.includes("školní akce a rozvrhy")));
ok("slovník nemluví o „školních termínech“", !JSON.stringify(BENEFITY).includes("termín"));
ok("karta soukromí vyká", /pozvete/.test(SOUKROMI.text) && !/pozveš/.test(SOUKROMI.text));

if (selhalo) {
  console.error(`\n${selhalo} selhalo`);
  process.exit(1);
}
console.log("\nVše v pořádku.");
