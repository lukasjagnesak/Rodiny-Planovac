/**
 * Cíle konverzí pro Google Ads.
 *
 * Kampaň se řídí podle konverzí. Když se konverze neposílá, svítí
 * u každého klíčového slova nula a rozpočet se rozděluje naslepo —
 * a když se pošle se špatným cílem, Google ji přiřadí k jiné konverzi
 * a čísla lžou způsobem, který nejde poznat.
 *
 * Spouští se přes `npm run test:ads`.
 */
const { adsCil } = require("../.test-build/marketing.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const ID = "AW-123456789";
const STITKY = { registrace: "AbC-dEf1", predplatne: "XyZ-9wQ2", rodina: "" };

console.log("── složení cíle ──");
ok("id lomeno štítek", adsCil("registrace", ID, STITKY) === "AW-123456789/AbC-dEf1");
ok("jiná konverze má jiný štítek", adsCil("predplatne", ID, STITKY) === "AW-123456789/XyZ-9wQ2");

console.log("── kdy se neposílá nic ──");
// Bez tohohle by se všechny konverze poslaly na „AW-123/", což Google
// přijme a přiřadí k něčemu jinému.
ok("chybějící štítek", adsCil("rodina", ID, STITKY) === null);
ok("neznámý druh události", adsCil("neznamy", ID, STITKY) === null);
ok("chybějící id účtu", adsCil("registrace", "", STITKY) === null);
ok("nic nenastaveno", adsCil("registrace", "", {}) === null);

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
