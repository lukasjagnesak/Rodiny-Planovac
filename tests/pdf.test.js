/**
 * Zapisovač PDF.
 *
 * Nemáme tu žádnou čtečku PDF, kterou by šlo výsledek ukázat, takže se
 * kontroluje to, co čtečka dělá: projde se tabulka odkazů, ověří se, že
 * každý ukazuje na svůj objekt, a hlavně se z hotového souboru přečte
 * text zpátky — přes mapu `ToUnicode`, stejně jako když někdo v PDF
 * kopíruje. Když projde tohle, čeština v dokumentu opravdu je.
 *
 * Spouští se přes `npm run test:pdf`.
 */
// `server-only` je pojistka pro sestavování Nextu: když ji načte
// obyčejný Node, schválně vyhodí výjimku. Pro test ji proto vložíme do
// mezipaměti jako prázdný modul, aby se její tělo vůbec nespustilo.
const cestaServerOnly = require.resolve("server-only");
require.cache[cestaServerOnly] = {
  id: cestaServerOnly,
  filename: cestaServerOnly,
  loaded: true,
  exports: {},
};

const { pdfDokument, sirkaTextu, zalom } = require("../.test-build/lib/pdf.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const VETA = "Příliš žluťoučký kůň úpěl ďábelské ódy — 1 990 Kč, 2–2–3.";

const pdf = pdfDokument(
  [
    { typ: "nadtitulek", text: "Kalkulačka výživného" },
    { typ: "nadpis", text: "Orientační výpočet výživného" },
    { typ: "odstavec", text: VETA },
    {
      typ: "karta",
      prvky: [
        { typ: "cislo", popis: "Výživné měsíčně", hodnota: "4 200 Kč" },
        { typ: "cara" },
        { typ: "radek", vlevo: "Příjem rodiče A", vpravo: "45 000 Kč" },
        { typ: "radek", vlevo: "Příjem rodiče B", vpravo: "32 000 Kč", silny: true },
      ],
    },
    { typ: "podnadpis", text: "Jak se k číslu došlo" },
    { typ: "odstavec", text: "Ěščřžýáíé ÚŮĎŤŇ ".repeat(40) },
  ],
  { titulek: "Výpočet výživného", paticka: "klidoo.cz" },
);

const text = pdf.toString("latin1");

console.log("── soubor ──");
ok("začíná hlavičkou PDF", text.startsWith("%PDF-1.7"));
ok("končí značkou konce", text.trimEnd().endsWith("%%EOF"));
ok(`má rozumnou velikost (${Math.round(pdf.length / 1024)} kB)`, pdf.length > 100_000 && pdf.length < 3_000_000);
ok("obsahuje vložené písmo", text.includes("/FontFile2"));
ok("kóduje přes Identity-H", text.includes("/Encoding /Identity-H"));
ok("má mapu pro kopírování textu", text.includes("/ToUnicode"));

console.log("── tabulka odkazů ──");
const zacatek = text.lastIndexOf("startxref");
const xref = Number(text.slice(zacatek + 9).trim().split(/\s/)[0]);
ok("startxref ukazuje na tabulku", text.slice(xref, xref + 4) === "xref");

const radky = text.slice(xref).split("\n");
const pocet = Number(radky[1].split(" ")[1]);
let vsechnySedi = true;
for (let i = 1; i < pocet; i += 1) {
  const offset = Number(radky[1 + i + 1].slice(0, 10));
  if (!new RegExp(`^${i} 0 obj`).test(text.slice(offset, offset + 20))) vsechnySedi = false;
}
ok(`všech ${pocet - 1} objektů sedí na svém místě`, vsechnySedi);

console.log("── délky proudů ──");
let delkySedi = true;
for (const m of text.matchAll(/\/Length (\d+)[^>]*>>\s*stream\n/g)) {
  const zacatekProudu = m.index + m[0].length;
  const konec = text.indexOf("\nendstream", zacatekProudu);
  if (konec - zacatekProudu !== Number(m[1])) delkySedi = false;
}
ok("každý proud má správně spočítanou délku", delkySedi);

console.log("── text jde přečíst zpátky ──");
// Mapa glyf → znak, přesně jak ji přečte čtečka při kopírování.
const mapa = new Map();
for (const m of text.matchAll(/<([0-9a-f]{4})> <([0-9a-f]{4})>/g)) {
  mapa.set(m[1], String.fromCharCode(parseInt(m[2], 16)));
}
ok(`mapa má rozumný počet znaků (${mapa.size})`, mapa.size > 20);

const zGlyfu = (hex) =>
  (hex.match(/.{4}/g) ?? []).map((g) => mapa.get(g) ?? "�").join("");
const prectene = [...text.matchAll(/<([0-9a-f]{8,})> Tj/g)].map((m) => zGlyfu(m[1]));
const cely = prectene.join("\n");

ok("nadpis je v dokumentu", cely.includes("Orientační výpočet výživného"));
ok("háčky a čárky sedí", cely.includes("Příliš žluťoučký kůň úpěl ďábelské ódy"));
ok("pomlčka i měna", cely.includes("1 990 Kč") || cely.includes("1 990 Kč"));
ok("schéma s pomlčkami", cely.includes("2–2–3"));
ok("pravý sloupec řádku", cely.includes("45 000 Kč"));
ok("žádný znak se neztratil", !cely.includes("�"));
ok("dlouhý text se zalomil na víc řádků", prectene.length > 12);

console.log("── značka v dokumentu ──");
ok(
  "kolečka znaku se kreslí křivkami (osm oblouků na stránku)",
  (text.match(/ c\n/g) ?? []).length >= 8,
);
ok("překryv koleček je prolnutím, ne třetí barvou", text.includes("/BM /Multiply"));
ok("prostředek prolnutí je ve zdrojích stránky", text.includes("/ExtGState << /GSprolnuti"));

// Barvy se berou z `lib/barvy.ts`, ta je hlídaná proti globals.css.
const { proPdf } = require("../.test-build/lib/barvy.js");
ok("krémový pruh hlavičky", text.includes(`${proPdf("canvas")} rg`));
ok("barva značky u částky", text.includes(`${proPdf("brand")} rg`));
ok("obě barvy rodičů ve znaku", text.includes(`${proPdf("parentA")} rg`) && text.includes(`${proPdf("parentB")} rg`));
ok("text v barvě inkoustu, ne černé", text.includes(`${proPdf("ink")} rg`));

const dokument = pdfDokument([{ typ: "odstavec", text: "Krátký dokument." }], {
  titulek: "Zkouška",
  paticka: "klidoo.cz",
});
const t2 = dokument.toString("latin1");
const mapa2 = new Map();
for (const m of t2.matchAll(/<([0-9a-f]{4})> <([0-9a-f]{4})>/g)) {
  mapa2.set(m[1], String.fromCharCode(parseInt(m[2], 16)));
}
const cely2 = [...t2.matchAll(/<([0-9a-f]{4,})> Tj/g)]
  .map((m) => (m[1].match(/.{4}/g) ?? []).map((g) => mapa2.get(g) ?? "?").join(""))
  .join("\n");
ok("nápis Klidoo je i na jednostránkovém dokumentu", cely2.includes("Klidoo"));
ok("v hlavičce je adresa webu", cely2.includes("klidoo.cz"));
ok("stránka je očíslovaná", cely2.includes("1 / 1"));

console.log("── písma z webu ──");
ok("tři řezy ve zdrojích stránky", /\/F1 \d+ 0 R \/F2 \d+ 0 R \/F3 \d+ 0 R/.test(text));
ok("nadpisy v Baloo 2", text.includes("/BaseFont /Baloo2-SemiBold"));
ok("text v Interu", text.includes("/BaseFont /Inter-Regular"));
ok("tučné je vlastní řez, ne obtažení", text.includes("/BaseFont /Inter-SemiBold") && !text.includes("2 Tr"));
ok("každý řez má vlastní vložený soubor", (text.match(/\/FontFile2/g) ?? []).length === 3);
ok("a vlastní mapu pro kopírování", (text.match(/\/ToUnicode/g) ?? []).length === 3);

console.log("── sazba jako na webu ──");
ok("krémový papír přes celou stranu", text.includes(`${proPdf("canvas")} rg 0 0 595.28 841.89 re f`));
ok("bílé karty se zaoblením", text.includes("1 1 1 rg"));
ok("karty mají obrys v barvě linky", text.includes(`${proPdf("line")} RG`));
ok(
  "nadtitulek je prostrkaný",
  /0\.9 Tc/.test(text),
);

console.log("── nadpis nezůstane sám ──");
// Nadpis na konci strany, jehož text by začal až na další, je chyba sazby.
const dlouhy = pdfDokument(
  [
    { typ: "odstavec", text: "Výplň. ".repeat(320) },
    { typ: "podnadpis", text: "Osamělý nadpis" },
    { typ: "odstavec", text: "Text, který k nadpisu patří a musí zůstat s ním." },
  ],
  { titulek: "Zkouška", paticka: "klidoo.cz" },
);
const t3 = dlouhy.toString("latin1");
const mapa3 = new Map();
for (const m of t3.matchAll(/<([0-9a-f]{4})> <([0-9a-f]{4})>/g)) {
  mapa3.set(m[1], String.fromCharCode(parseInt(m[2], 16)));
}
const strany = t3
  .split("/Type /Page")
  .slice(1)
  .map((kus) => kus);
const obsahy = [...t3.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map((m) => m[1]);
const textStrany = obsahy.map((o) =>
  [...o.matchAll(/<([0-9a-f]{4,})> Tj/g)]
    .map((m) => (m[1].match(/.{4}/g) ?? []).map((g) => mapa3.get(g) ?? "?").join(""))
    .join(" "),
);
const kdeNadpis = textStrany.findIndex((t) => t.includes("Osamělý nadpis"));
ok("nadpis se našel", kdeNadpis >= 0);
ok(
  "text k nadpisu je na téže straně",
  kdeNadpis >= 0 && textStrany[kdeNadpis].includes("musí zůstat s ním"),
);
void strany;

console.log("── měření a zalomení ──");
ok("širší text je širší", sirkaTextu("mmmm", 10) > sirkaTextu("iiii", 10));
ok("diakritika nemění šířku písmene", Math.abs(sirkaTextu("e", 10) - sirkaTextu("ě", 10)) < 0.01);
const zalomeno = zalom("slovo ".repeat(60).trim(), 10, 200);
ok("zalomení drží šířku", zalomeno.every((r) => sirkaTextu(r, 10) <= 200));
ok("zalomení nic nezahodí", zalomeno.join(" ").split(" ").length === 60);

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
