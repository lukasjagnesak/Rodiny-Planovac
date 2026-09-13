/**
 * Šířka na mobilu — kontrola v opravdovém prohlížeči.
 *
 * Hlídá jedinou věc: stránka nesmí být širší než displej. Když je,
 * prohlížeč ji zmenší, aby se vešla, a všechno na ní je najednou malé a
 * roztažené. Přesně to se stalo přehledu — mřížka bez určeného počtu
 * sloupců si udělala sloupec šířky `auto` a ten se roztáhl na nejdelší
 * jméno rodiče.
 *
 * Proč zvlášť test v prohlížeči: tohle nepozná typová kontrola ani
 * jednotkový test a v diffu to není vidět. Pozná to jenom skutečné
 * rozvržení ve skutečné šířce.
 *
 * Potřebuje běžící aplikaci ve vývojovém režimu (kvůli `/nahled-mobil`)
 * a nainstalovaný Playwright, takže není součástí `npm test`:
 *
 *     npm run dev -- --port 3100
 *     PLAYWRIGHT=$(npm root -g)/playwright npm run test:mobil
 */
const { chromium } = require(process.env.PLAYWRIGHT ?? "playwright");

const ADRESA = process.env.ADRESA ?? "http://localhost:3100";

/** Nejužší displej, se kterým se dnes reálně počítá (iPhone SE). */
const SIRKA = 375;

const STRANKY = [
  ["domovská stránka", "/"],
  ["ceník", "/cenik"],
  ["kalkulačka", "/kalkulacka"],
  ["jak funguje střídavá péče", "/jak-funguje-stridava-pece"],
  ["kalkulačka výživného", "/kalkulacka-vyzivneho"],
  ["přihlášení", "/prihlaseni"],
  ["registrace", "/registrace"],
  // Aplikace samotná. Bez přihlášení se jinam nedostaneme, ale přehled
  // je z obrazovek nejsložitější — a byl to on, kdo se rozbil.
  ["přehled aplikace", "/nahled-mobil"],
];

(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  });
  let selhalo = 0;

  const ctx = await b.newContext({ viewport: { width: SIRKA, height: 812 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();

  console.log(`── šířka ${SIRKA} px ──`);

  for (const [popis, cesta] of STRANKY) {
    await p.goto(ADRESA + cesta, { waitUntil: "networkidle" });
    // Fotky a písma dojedou později a můžou rozvržení ještě posunout.
    await p.waitForTimeout(500);

    const m = await p.evaluate(() => {
      const de = document.documentElement;
      const prekracuje = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        // Vlastní posuvník uvnitř prvku je v pořádku — tak se dělá
        // široká tabulka. Nevadí ani ozdoby, které schválně přetékají.
        const styl = getComputedStyle(el);
        if (styl.position === "fixed" || styl.position === "absolute") continue;
        if (styl.overflowX === "auto" || styl.overflowX === "scroll") continue;
        if (r.width > 0 && r.right > de.clientWidth + 1) {
          prekracuje.push(el.tagName.toLowerCase() + " ." + String(el.className || "").slice(0, 60));
        }
      }
      return { okno: de.clientWidth, stranka: de.scrollWidth, prekracuje: prekracuje.slice(0, 3) };
    });

    const sedi = m.stranka <= m.okno;
    console.log((sedi ? "  ✓ " : "  ✗ ") + popis + `  (${m.stranka} px na ${m.okno} px)`);
    if (!sedi) {
      selhalo++;
      for (const p of m.prekracuje) console.log("      přetéká: " + p);
    }
  }

  await b.close();
  console.log(selhalo === 0 ? "\nVšechno se vejde." : `\n${selhalo} stránek přetéká.`);
  process.exit(selhalo === 0 ? 0 : 1);
})();
