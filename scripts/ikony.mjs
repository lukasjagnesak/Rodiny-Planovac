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
// ── Ikony pro push notifikace (PNG — SVG notifikace neumí) ─────────
// `<nazev>.png`: 192 × 192, ikona v barvě značky na světlé dlaždici —
// velký obrázek vedle textu notifikace (Android, počítač).
// `<nazev>-odznak.png`: 96 × 96, bílá na průhledném — Android z ní bere
// jen tvar a kreslí ji do stavového řádku.
const sharp = createRequire(import.meta.url)("sharp");
const push = path.join(cil, "push");
await mkdir(push, { recursive: true });
const { IKONY } = createRequire(import.meta.url)("../.test-build/lib/ikony.js");

const dlazdice = (vnitrek) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">` +
  `<rect width="192" height="192" rx="44" fill="#e2f1ec"/>` +
  `<g transform="translate(36 36) scale(5)" fill="none" stroke="${ZNACKA}" stroke-width="1.75" ` +
  `stroke-linecap="round" stroke-linejoin="round" color="${ZNACKA}">${vnitrek}</g></svg>`;

const odznak = (vnitrek) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">` +
  `<g transform="translate(12 12) scale(3)" fill="none" stroke="#ffffff" stroke-width="2" ` +
  `stroke-linecap="round" stroke-linejoin="round" color="#ffffff">${vnitrek}</g></svg>`;

for (const nazev of NAZVY_IKON) {
  await sharp(Buffer.from(dlazdice(IKONY[nazev]))).png().toFile(path.join(push, `${nazev}.png`));
  await sharp(Buffer.from(odznak(IKONY[nazev]))).png().toFile(path.join(push, `${nazev}-odznak.png`));
}

console.log(`✓ ${NAZVY_IKON.length} ikon v public/ikony (SVG) a public/ikony/push (PNG pro notifikace)`);
