/**
 * Podívat se na vygenerované PDF očima, ne jen testem.
 *
 * Testy ověří, že je v dokumentu správný text a správné barvy. Neřeknou
 * ale, jestli něco nepřetéká na další stranu nebo jestli nápis nesedí
 * na kolečkách znaku — a přesně tyhle dvě věci se při úpravách sazby
 * kazí nejčastěji.
 *
 * Potřebuje dvě věci, které v projektu schválně nejsou (obojí jen kvůli
 * náhledu, do běhu aplikace nezasahují):
 *
 *     npm install --no-save pdfjs-dist@4
 *     npx playwright install chromium     # nebo systémový, viz PLAYWRIGHT
 *
 * Spuštění:
 *
 *     node scripts/nahled-pdf.mjs vypocet.pdf nahled.png
 */

import { mkdtempSync, copyFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const [, , vstupniPdf, vystupniPng = "nahled.png"] = process.argv;
if (!vstupniPdf) {
  console.error("Použití: node scripts/nahled-pdf.mjs <soubor.pdf> [nahled.png]");
  process.exit(1);
}

const pracovni = mkdtempSync(join(tmpdir(), "nahled-pdf-"));
const zdrojPdfJs = "node_modules/pdfjs-dist/build";
for (const soubor of ["pdf.mjs", "pdf.worker.mjs"]) {
  copyFileSync(join(zdrojPdfJs, soubor), join(pracovni, soubor));
}
copyFileSync(resolve(vstupniPdf), join(pracovni, "dokument.pdf"));

// pdf.js načítá dokument přes fetch, a ten na `file://` neprojde kvůli
// zásadám původu. Proto malý server místo přímého otevření souboru.
writeFileSync(
  join(pracovni, "index.html"),
  `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#8a8a8a">
<div id="strany"></div>
<script type="module">
import * as pdfjs from "./pdf.mjs";
pdfjs.GlobalWorkerOptions.workerSrc = "./pdf.worker.mjs";
const data = await (await fetch("./dokument.pdf")).arrayBuffer();
const dokument = await pdfjs.getDocument({ data }).promise;
for (let i = 1; i <= dokument.numPages; i += 1) {
  const strana = await dokument.getPage(i);
  const pohled = strana.getViewport({ scale: 1.6 });
  const platno = document.createElement("canvas");
  platno.width = pohled.width;
  platno.height = pohled.height;
  platno.style.cssText = "display:block;margin:14px auto";
  document.getElementById("strany").appendChild(platno);
  await strana.render({ canvasContext: platno.getContext("2d"), viewport: pohled, canvas: platno }).promise;
}
document.title = "hotovo";
</script></body>`,
);

const server = createServer((pozadavek, odpoved) => {
  const jmeno = (pozadavek.url ?? "/").split("?")[0].replace(/^\//, "") || "index.html";
  try {
    const typ = jmeno.endsWith(".pdf")
      ? "application/pdf"
      : jmeno.endsWith(".mjs")
        ? "text/javascript"
        : "text/html; charset=utf-8";
    odpoved.writeHead(200, { "content-type": typ });
    odpoved.end(readFileSync(join(pracovni, jmeno)));
  } catch {
    odpoved.writeHead(404).end();
  }
});

await new Promise((hotovo) => server.listen(0, "127.0.0.1", hotovo));
const { port } = server.address();

// `PLAYWRIGHT` může ukazovat na složku globální instalace; ESM import
// takovou cestu neumí, proto přes `createRequire`.
const { createRequire } = await import("node:module");
const nacti = createRequire(import.meta.url);
const { chromium } = nacti(process.env.PLAYWRIGHT ?? "playwright");
const prohlizec = await chromium.launch();
const strana = await prohlizec.newPage({ viewport: { width: 1000, height: 1400 } });
strana.on("pageerror", (chyba) => console.error("[stránka]", String(chyba).slice(0, 200)));
await strana.goto(`http://127.0.0.1:${port}/index.html`);
await strana.waitForFunction(() => document.title === "hotovo", { timeout: 30_000 });
await strana.screenshot({ path: vystupniPng, fullPage: true });
const stran = await strana.evaluate(() => document.querySelectorAll("canvas").length);
await prohlizec.close();
server.close();

console.log(`${vystupniPng} — ${stran} ${stran === 1 ? "strana" : "stran"}`);
