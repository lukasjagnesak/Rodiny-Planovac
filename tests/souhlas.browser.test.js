/**
 * Souhlas s cookies — kontrola v opravdovém prohlížeči.
 *
 * Tohle je jediný test v projektu, který hlídá zákonnou povinnost:
 * dokud člověk neklikne, nesmí odejít jediný požadavek na Google ani
 * na Metu. Regrese by se přitom nijak neprojevila — web by fungoval
 * dál, jen by porušoval pravidla.
 *
 * Potřebuje běžící aplikaci a nainstalovaný Playwright, takže není
 * součástí `npm test`:
 *
 *     NEXT_PUBLIC_GA_ID=G-TEST NEXT_PUBLIC_META_PIXEL_ID=123 npm run dev -- --port 3100
 *     PLAYWRIGHT=$(npm root -g)/playwright npm run test:souhlas
 */
const { chromium } = require(process.env.PLAYWRIGHT ?? "playwright");

const TRETI_STRANY = /googletagmanager|google-analytics|connect\.facebook|facebook\.net|doubleclick/i;

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  let selhalo = 0;
  const ok = (popis, podminka) => {
    console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
    if (!podminka) selhalo++;
  };

  // ── 1) Před rozhodnutím nesmí odejít nic ──────────────────────
  {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
    const p = await ctx.newPage();
    const volani = [];
    p.on('request', (r) => { if (TRETI_STRANY.test(r.url())) volani.push(r.url()); });

    await p.goto('http://localhost:3100/', { waitUntil: 'networkidle' });
    await p.waitForTimeout(1200);

    console.log("── před rozhodnutím ──");
    ok("lišta se ukáže", await p.getByRole('dialog', { name: 'Nastavení soukromí' }).isVisible());
    ok("žádné volání na Google ani Meta", volani.length === 0);
    ok("odmítnutí je vidět hned, ne o dvě kliknutí dál", await p.getByRole('button', { name: 'Jen nutné' }).isVisible());
    ok("vlastní měření běží i tak", await p.evaluate(() => Boolean(window.sessionStorage.getItem('klidoo_odkud'))));

    // ── 2) Jen nutné ──────────────────────────────────────────
    console.log("-- po Jen nutne --");
    volani.length = 0;
    await p.getByRole('button', { name: 'Jen nutné' }).click();
    await p.waitForTimeout(800);
    await p.goto('http://localhost:3100/cenik', { waitUntil: 'networkidle' });
    await p.waitForTimeout(1000);
    ok("lišta zmizela", !(await p.getByRole('dialog', { name: 'Nastavení soukromí' }).isVisible().catch(() => false)));
    ok("pořád nic na Google ani Metu", volani.length === 0);
    ok("consent mode je odepřený", await p.evaluate(() => {
      const d = window.dataLayer || [];
      return d.some((z) => z && z[0] === 'consent' && z[1] === 'default' && z[2] && z[2].ad_storage === 'denied');
    }));
    await ctx.close();
  }

  // ── 3) Přijmout vše ───────────────────────────────────────────
  {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
    const p = await ctx.newPage();
    const volani = [];
    p.on('request', (r) => { if (TRETI_STRANY.test(r.url())) volani.push(r.url()); });

    await p.goto('http://localhost:3100/', { waitUntil: 'networkidle' });
    await p.getByRole('button', { name: 'Přijmout vše' }).click();
    await p.waitForTimeout(2000);

    console.log("-- po Prijmout vse --");
    ok("gtag.js se načte", volani.some((u) => /googletagmanager/.test(u)));
    ok("Meta Pixel se načte", volani.some((u) => /facebook\.net/.test(u)));
    ok("souhlas se povýšil na granted", await p.evaluate(() => {
      const d = window.dataLayer || [];
      return d.some((z) => z && z[0] === 'consent' && z[1] === 'update' && z[2] && z[2].ad_storage === 'granted');
    }));

    // volba přežije načtení stránky
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(500);
    ok("po znovunačtení se lišta neptá znovu", !(await p.getByRole('dialog', { name: 'Nastavení soukromí' }).isVisible().catch(() => false)));
    await ctx.close();
  }

  await b.close();
  console.log(selhalo === 0 ? "\nVšechno prošlo." : `\nSelhalo: ${selhalo}`);
  process.exit(selhalo === 0 ? 0 : 1);
})();
