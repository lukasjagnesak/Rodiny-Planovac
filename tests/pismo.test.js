/**
 * Má písmo, které používáme, opravdu české znaky?
 *
 * Deklarovaný rozsah `latin-ext` v CSS od Googlu nic neznamená — Fredoka,
 * kterou jsme používali původně, ho hlásí, ale glyfy č ď ě ň ř ť ů v souboru
 * nemá. Prohlížeč pak u každého takového písmene spadne na náhradní font
 * a slovo se rozsype uprostřed. Na češtině je to vidět skoro v každém nadpisu.
 *
 * Tenhle test stahuje písma z Googlu, takže potřebuje síť a do `npm test`
 * schválně nepatří. Spouštěj ho při výměně písma:
 *
 *     npm run test:pismo
 */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

/** Písma, na kterých aplikace stojí. Musí sedět s src/app/layout.tsx. */
const PISMA = [
  { jmeno: "Baloo 2 (nadpisy a značka)", dotaz: "Baloo+2:wght@500;600" },
  { jmeno: "Inter (text aplikace)", dotaz: "Inter:wght@400;500;600" },
];

/** Všechny znaky s diakritikou, které čeština potřebuje. */
const CESKE = "áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ";

// Bez plného User-Agentu vrací Google starší formáty a jiné rozsahy.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function stahni(url, binarne = false) {
  return execFileSync("curl", ["-sS", "-m", "40", "-A", UA, url], {
    maxBuffer: 64 * 1024 * 1024,
    encoding: binarne ? "buffer" : "utf8",
  });
}

/** Přečte z písma seznam kódů znaků, které umí vykreslit. */
function znakyVeFontu(soubor) {
  const kod = `
from fontTools.ttLib import TTFont
import sys
f = TTFont(sys.argv[1])
kody = set()
for t in f["cmap"].tables:
    kody |= set(t.cmap.keys())
print(" ".join(str(k) for k in sorted(kody)))
`;
  const vystup = execFileSync("python3", ["-c", kod, soubor], {
    maxBuffer: 64 * 1024 * 1024,
    encoding: "utf8",
  });
  return new Set(vystup.trim().split(/\s+/).map(Number));
}

let selhalo = 0;

for (const { jmeno, dotaz } of PISMA) {
  const css = stahni(`https://fonts.googleapis.com/css2?family=${dotaz}&display=swap`);
  const adresy = [
    ...new Set(
      [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.(?:woff2|ttf))\)/g)].map(
        (m) => m[1],
      ),
    ),
  ];

  if (adresy.length === 0) {
    console.log(`  ✗ ${jmeno}: z Googlu nepřišel žádný soubor písma`);
    selhalo++;
    continue;
  }

  const pokryti = new Set();
  const docasny = fs.mkdtempSync(path.join(os.tmpdir(), "pismo-"));

  for (const adresa of adresy) {
    const cesta = path.join(docasny, path.basename(new URL(adresa).pathname));
    fs.writeFileSync(cesta, stahni(adresa, true));
    for (const kod of znakyVeFontu(cesta)) pokryti.add(kod);
  }
  fs.rmSync(docasny, { recursive: true, force: true });

  const chybi = [...CESKE].filter((z) => !pokryti.has(z.codePointAt(0)));

  if (chybi.length === 0) {
    console.log(`  ✓ ${jmeno}: čeština kompletní (${pocetSouboru(adresy.length)})`);
  } else {
    console.log(`  ✗ ${jmeno}: chybí ${chybiPocet(chybi)} — ${chybi.join(" ")}`);
    selhalo++;
  }
}

function chybiPocet(chybi) {
  if (chybi.length === 1) return "1 znak";
  if (chybi.length < 5) return `${chybi.length} znaky`;
  return `${chybi.length} znaků`;
}

function pocetSouboru(pocet) {
  if (pocet === 1) return "1 soubor";
  if (pocet < 5) return `${pocet} soubory`;
  return `${pocet} souborů`;
}

console.log(selhalo === 0 ? "\nPísma jsou v pořádku." : `\nSelhalo: ${selhalo}`);
process.exit(selhalo === 0 ? 0 : 1);
