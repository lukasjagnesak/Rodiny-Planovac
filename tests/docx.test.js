/**
 * Skládáme .docx ručně, protože kvůli jednomu materiálu ke stažení nemá
 * smysl tahat do projektu balík. Ručně psané hlavičky ZIPu jsou ale přesně
 * to, co se rozbije potichu — soubor se stáhne a Word ho odmítne otevřít.
 *
 * Proto se tu kontroluje, že výsledek je platný ZIP se správnými součty,
 * že XML uvnitř je platné a že čeština v něm přežila.
 *
 * Spouští se přes `npm run test:docx`.
 */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { vytvorDocx } = require("../.test-build/docx.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const ODSTAVCE = [
  { druh: "nadpis1", text: "Checklist prvních 30 dní" },
  { druh: "text", text: "Věci, na které se zapomíná — příliš žluťoučký kůň." },
  { druh: "nadpis2", text: "Škola a školka" },
  { druh: "odrazka", text: "Nahlásit oba rodiče jako kontaktní osoby." },
  { druh: "odrazka", text: 'Uvozovky "takhle" & ampersand <ostré závorky>.' },
  { druh: "drobne", text: "Klidoo — klidoo.cz" },
];

const soubor = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "docx-")), "test.docx");
fs.writeFileSync(soubor, vytvorDocx(ODSTAVCE));

console.log("── soubor ──");
ok("něco se vyrobilo", fs.statSync(soubor).size > 500);
ok(
  "začíná podpisem ZIPu",
  fs.readFileSync(soubor).subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
);

console.log("── platnost archivu ──");
// Python ověří CRC i strukturu rejstříku — přesně to, co si ručně psané
// hlavičky nejspíš rozbijou.
const kontrola = execFileSync(
  "python3",
  [
    "-c",
    `
import zipfile, sys, xml.dom.minidom as dom
z = zipfile.ZipFile(sys.argv[1])
vadny = z.testzip()
print("VADNY" if vadny else "OK")
print("|".join(sorted(z.namelist())))
d = z.read("word/document.xml").decode("utf-8")
dom.parseString(d)
print("XML_OK")
print("DIAKRITIKA_OK" if "žluťoučký kůň" in d else "DIAKRITIKA_CHYBI")
print("ESCAPE_OK" if "&amp;" in d and "&lt;ostré" in d else "ESCAPE_CHYBI")
print("POLICKO_OK" if "☐" in d else "POLICKO_CHYBI")
`,
    soubor,
  ],
  { encoding: "utf8" },
).trim().split("\n");

ok("archiv projde kontrolou CRC", kontrola[0] === "OK");
ok(
  "obsahuje tři povinné části",
  kontrola[1] === "[Content_Types].xml|_rels/.rels|word/document.xml",
);
ok("document.xml je platné XML", kontrola[2] === "XML_OK");
ok("čeština přežila", kontrola[3] === "DIAKRITIKA_OK");
ok("ampersand a závorky jsou ošetřené", kontrola[4] === "ESCAPE_OK");
ok("odrážky mají zaškrtávací políčko", kontrola[5] === "POLICKO_OK");

fs.rmSync(path.dirname(soubor), { recursive: true, force: true });

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\nSelhalo: ${selhalo}`);
process.exit(selhalo === 0 ? 0 : 1);
