/**
 * Nabídka „Klidoo na ploše" na přehledu.
 *
 * Testuje se v prohlížeči, protože se celá řídí věcmi, které jinde
 * neexistují: `display-mode`, `navigator.maxTouchPoints` a výzva od
 * Chromu. Tu v headless prohlížeči nedostaneme, takže se podstrčí —
 * komponenta se rozhoduje jen podle `window.__klidooVyzva`.
 *
 * Hlídá dvě věci. Že se nabídka vůbec ukáže, protože přesně tím, že se
 * neukazovala, celá vznikla. A že je na stránce **jedna** — dřív jich
 * bylo víc, karta na přehledu a pruh nad stránkou zároveň.
 *
 * Potřebuje běžící `npm run dev` a nainstalovaný Playwright, takže
 * není součástí `npm test`:
 *
 *     npm run dev -- --port 3100
 *     PLAYWRIGHT=$(npm root -g)/playwright npm run test:instalace-karta
 */
const { chromium } = require(process.env.PLAYWRIGHT ?? "playwright");

const ADRESA = process.env.ADRESA ?? "http://localhost:3100";
const SIRKA = 375;

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: SIRKA, height: 720 } });

  await page.addInitScript(() => {
    // Skript v layoutu na `window.__klidooVyzva` sahá, ale jen zápisem —
    // getter bez setteru zápis mlčky spolkne a naše hodnota zůstane.
    Object.defineProperty(window, "__klidooVyzva", {
      configurable: true,
      get() {
        return {
          prompt: async () => {},
          userChoice: Promise.resolve({ outcome: "dismissed" }),
        };
      },
    });
  });

  await page.goto(`${ADRESA}/nahled-mobil`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const nadpis = page.getByText("Klidoo na ploše", { exact: true });
  const kolik = await nadpis.count();

  console.log(`── nabídka na ploše (${SIRKA} px) ──`);
  ok("je na stránce právě jednou", kolik === 1);
  ok("a je vidět", kolik === 1 && (await nadpis.isVisible()));
  ok(
    "má tlačítko, které instaluje",
    await page.getByRole("button", { name: "Přidat na plochu" }).isVisible(),
  );
  ok(
    "i způsob, jak ji odložit",
    await page.getByRole("button", { name: "Teď ne" }).isVisible(),
  );

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  ok(`stránka se vejde na displej (${scrollWidth} ≤ ${clientWidth})`, scrollWidth <= clientWidth);

  await browser.close();

  console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
  process.exit(selhalo === 0 ? 0 : 1);
})();
