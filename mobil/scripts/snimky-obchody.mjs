/**
 * Snímky obrazovky pro App Store a Google Play → mobil/obchody/snimky/
 *
 * Skutečné obrazovky s ukázkovou rodinou (vývojová stránka /nahled-mobil).
 *
 *   npx next dev -p 3110                         (v kořeni projektu)
 *   node mobil/scripts/snimky-obchody.mjs http://localhost:3110
 *
 * Rozměry:
 *   ios/      1320 × 2868  (iPhone 6,9")
 *   android/  1080 × 2340  (telefon)
 */
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT ?? "playwright");
const zaklad = process.argv[2] ?? "http://localhost:3110";
const OBRAZOVKY = ["prehled", "kalendar", "vydaje", "krouzky", "zpravy", "historie"];
const ZARIZENI = [
  { slozka: "ios", sirka: 440, vyska: 956, hustota: 3 },
  { slozka: "android", sirka: 360, vyska: 780, hustota: 3 },
];

const prohlizec = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
for (const z of ZARIZENI) {
  const cil = path.join(process.cwd(), "mobil", "obchody", "snimky", z.slozka);
  await mkdir(cil, { recursive: true });
  const kontext = await prohlizec.newContext({
    viewport: { width: z.sirka, height: z.vyska },
    deviceScaleFactor: z.hustota,
    colorScheme: "light",
    locale: "cs-CZ",
    timezoneId: "Europe/Prague",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 KlidooApp",
  });
  await kontext.addInitScript(() => {
    try {
      localStorage.setItem("klidoo-instalace-skryto", String(Date.now()));
    } catch {}
  });
  for (const [i, obrazovka] of OBRAZOVKY.entries()) {
    const s = await kontext.newPage();
    await s.goto(`${zaklad}/nahled-mobil/${obrazovka}`, { waitUntil: "load", timeout: 120000 });
    await s.addStyleTag({
      content: "nextjs-portal{display:none!important} *{animation:none!important;transition:none!important}",
    });
    await s.waitForTimeout(1500);
    await s.screenshot({ path: path.join(cil, `${String(i + 1).padStart(2, "0")}-${obrazovka}.png`) });
    console.log("✓", z.slozka, obrazovka);
    await s.close();
  }
  await kontext.close();
}
await prohlizec.close();
