/**
 * Samostatné SVG ikon Klidoo → public/ikony/<nazev>.svg
 *
 * Pro web mimo React, e-maily, prezentace a sociální sítě. Zdroj je
 * jediný: src/lib/ikony.ts. Spouští se přes `npm run ikony`, který ho
 * nejdřív přeloží do .test-build.
 *
 * Barva je `currentColor`: vložené do HTML převezmou barvu textu, jako
 * obrázek (<img>) se vykreslí černě. Pro obrázek v barvě značky použijte
 * soubory s příponou -znacka.svg.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const { NAZVY_IKON, svgIkony } = createRequire(import.meta.url)("../.test-build/lib/ikony.js");
const cil = path.join(process.cwd(), "public", "ikony");
await mkdir(cil, { recursive: true });

// Barva značky (--brand, oklch(53% 0.09 175)) v hex pro soubory mimo web.
const ZNACKA = "#2f7d6d";

for (const nazev of NAZVY_IKON) {
  const svg = svgIkony(nazev, 24);
  await writeFile(path.join(cil, `${nazev}.svg`), svg + "\n");
  await writeFile(
    path.join(cil, `${nazev}-znacka.svg`),
    svg.replaceAll("currentColor", ZNACKA) + "\n",
  );
}
console.log(`✓ ${NAZVY_IKON.length} ikon v public/ikony`);
