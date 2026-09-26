/**
 * Paleta pro PDF nesmí utéct paletě v CSS.
 *
 * Barvy žijí v `app/globals.css` jako oklch. PDF umí jen RGB, takže si
 * `lib/barvy.ts` ty trojice opakuje a převádí. Dva seznamy téhož se
 * dřív nebo později rozejdou — tohle je hlídá.
 *
 * Spouští se přes `npm run test:barvy-pdf`.
 */
const fs = require("node:fs");
const path = require("node:path");
const { PALETA, oklchNaRgb, naHex } = require("../.test-build/lib/barvy.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const css = fs.readFileSync(path.join(__dirname, "..", "src/app/globals.css"), "utf8");
// Jen světlá paleta: tmavá se v tištěném dokumentu neuplatní.
//
// Hledá se až za `:root` — `@custom-variant dark` na začátku souboru
// obsahuje stejný dotaz na médium a bez toho by výsek vyšel prázdný.
const zacatekSvetle = css.indexOf(":root {");
const zacatekTmave = css.indexOf("@media (prefers-color-scheme: dark)", zacatekSvetle);
const svetla = css.slice(zacatekSvetle, zacatekTmave);

function zCss(promenna) {
  const m = svetla.match(
    new RegExp(`--${promenna}:\\s*oklch\\(([\\d.]+)%\\s+([\\d.]+)\\s+([\\d.]+)\\)`),
  );
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

const DVOJICE = {
  ink: "ink",
  inkMuted: "ink-muted",
  inkSubtle: "ink-subtle",
  line: "line",
  canvas: "canvas",
  brand: "brand",
  brandSoft: "brand-soft",
  parentA: "parent-a",
  parentB: "parent-b",
};

console.log("── paleta sedí s globals.css ──");
ok("světlá část souboru se našla", svetla.length > 500);
for (const [klic, promenna] of Object.entries(DVOJICE)) {
  const vCss = zCss(promenna);
  const vKodu = PALETA[klic];
  ok(
    `--${promenna} = oklch(${vKodu.join(" ")})`,
    Boolean(vCss) && vCss.every((h, i) => Math.abs(h - vKodu[i]) < 1e-9),
  );
}

console.log("── převod na RGB ──");
// Barva motivu v `app/layout.tsx` je odvozená z `--canvas` a je zapsaná
// ručně jako #fdf7f0. Když sedí, sedí i celý převod.
ok(`canvas je #fdf7f0 (${naHex("canvas")})`, naHex("canvas") === "#fdf7f0");
ok("bílá zůstane bílá", oklchNaRgb([100, 0, 0]).every((k) => Math.abs(k - 1) < 0.001));
ok("černá zůstane černá", oklchNaRgb([0, 0, 0]).every((k) => k < 0.001));
ok(
  "značka je zelenomodrá, ne šedá",
  (() => {
    const [r, g, b] = oklchNaRgb(PALETA.brand);
    return g > r + 0.15 && b > r + 0.1;
  })(),
);
ok(
  "druhý rodič je teplý odstín",
  (() => {
    const [r, , b] = oklchNaRgb(PALETA.parentB);
    return r > b + 0.2;
  })(),
);
ok(
  "kanály nikdy nevypadnou z rozsahu",
  Object.keys(PALETA).every((k) => oklchNaRgb(PALETA[k]).every((c) => c >= 0 && c <= 1)),
);

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
