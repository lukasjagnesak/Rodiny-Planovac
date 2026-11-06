/**
 * Snímky skutečné aplikace pro web → public/ukazky/<obrazovka>.png
 *
 * Kreslí opravdové obrazovky s ukázkovou rodinou (lib/ukazkova-rodina)
 * přes vývojovou stránku /nahled-mobil/<obrazovka>. Spouští se ručně,
 * když se aplikace viditelně změní:
 *
 *   npx next dev -p 3110            (v jiném okně)
 *   node scripts/snimky-aplikace.mjs http://localhost:3110
 *
 * V tomhle prostředí je prohlížeč jinde než výchozí: CHROMIUM=/opt/pw-browsers/chromium.
 */
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

// Stejně jako `nahled-pdf.mjs`: `PLAYWRIGHT` smí ukazovat na globální
// instalaci, a takovou cestu umí jen `require`.
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT ?? "playwright");

const zaklad = process.argv[2] ?? "http://localhost:3000";
const OBRAZOVKY = ["prehled", "kalendar", "vydaje", "krouzky", "zpravy", "rozvrh", "historie"];
const cil = path.join(process.cwd(), "public", "ukazky");
await mkdir(cil, { recursive: true });

const prohlizec = await chromium.launch(
  process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {},
);
// Šířka iPhonu, dvojnásobná hustota — ostré i na retině, a pořád malé.
const kontext = await prohlizec.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  colorScheme: "light",
  locale: "cs-CZ",
  timezoneId: "Europe/Prague",
});
// Bez lišty souhlasu a výzvy k instalaci — na snímku nemají co dělat.
await kontext.addInitScript(() => {
  try {
    localStorage.setItem("klidoo-souhlas", JSON.stringify({ analytika: false, marketing: false, cas: Date.now() }));
    localStorage.setItem("klidoo-instalace-skryto", String(Date.now()));
  } catch {}
});

for (const obrazovka of OBRAZOVKY) {
  const stranka = await kontext.newPage();
  await stranka.goto(`${zaklad}/nahled-mobil/${obrazovka}`, { waitUntil: "networkidle" });
  // Vývojový odznak Nextu a plynulé animace do snímku nepatří.
  await stranka.addStyleTag({
    content: "nextjs-portal{display:none!important} *{animation:none!important;transition:none!important}",
  });
  await stranka.waitForTimeout(400);
  await stranka.screenshot({ path: path.join(cil, `${obrazovka}.png`) });
  console.log("✓", obrazovka);
  await stranka.close();
}

await prohlizec.close();
