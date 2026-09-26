/**
 * Náhled rozpisu na vstupní stránce z reklamy.
 *
 * Dvě věci se tu nesmí pokazit: co člověk uvidí, musí sedět (jinak se po
 * registraci podívá do kalendáře a uvidí něco jiného), a zadání musí projít
 * kontrolou na serveru (jinak „Uložit do Klidoo" skončí chybou u člověka,
 * za kterého jsme zaplatili proklik).
 *
 * Spouští se přes `npm run test:rozvrh-nahled`.
 */
const { planZVolby, nahledCtyrTydnu, pondeliTohotoTydne, RYTMY } = require("../.test-build/lib/rozvrh-nahled.js");
const { zkontrolujVstup } = require("../.test-build/lib/kalkulacka.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

// Středa 1. října 2026 — týden začíná v září, ať se chytí přechod měsíce.
const STREDA = new Date(2026, 9, 1, 12, 0);

console.log("── od kdy se počítá ──");
{
  const po = pondeliTohotoTydne(STREDA);
  ok("od pondělí tohoto týdne", po.getDay() === 1 && po.getDate() === 28 && po.getMonth() === 8);
  const plan = planZVolby("tyden", "ja", STREDA);
  ok("kotva je to pondělí", plan.anchorDate === "2026-09-28");
}

console.log("── každá volba projde kontrolou na serveru ──");
for (const r of RYTMY) {
  for (const kdo of ["ja", "druhy"]) {
    const chyba = zkontrolujVstup(planZVolby(r.id, kdo, STREDA));
    ok(`${r.nazev}, ${kdo === "ja" ? "u mě" : "u druhého"}${chyba ? ` — ${chyba}` : ""}`, chyba === null);
  }
}

console.log("── týden a týden ──");
{
  const n = nahledCtyrTydnu(planZVolby("tyden", "ja", STREDA), STREDA);
  ok("čtyři týdny po sedmi dnech", n.tydny.length === 4 && n.tydny.every((t) => t.length === 7));
  ok("začíná pondělím", n.tydny[0][0].datum.getDay() === 1);
  ok("tento týden je u mě", n.tydny[0].slice(1).every((d) => d.strana === "a"));
  ok("příští týden u druhého", n.tydny[1].slice(1).every((d) => d.strana === "b"));
  ok("noci napůl", n.nociJa === 14 && n.nociDruhy === 14);
  ok("dnešek je označený jednou", n.tydny.flat().filter((d) => d.dnes).length === 1);
  ok("a je to středa", n.tydny.flat().find((d) => d.dnes)?.klic === "2026-10-01");

  const obracene = nahledCtyrTydnu(planZVolby("tyden", "druhy", STREDA), STREDA);
  ok("„u druhého“ otočí strany", obracene.tydny[0].slice(1).every((d) => d.strana === "b"));
}

console.log("── 2-2-3 ──");
{
  const n = nahledCtyrTydnu(planZVolby("223", "ja", STREDA), STREDA);
  const t = n.tydny[0].map((d) => d.strana).join("");
  // Pondělí je den předání, takže se porovnává od úterý.
  ok(`první týden Po–Út u mě, St–Čt u druhého, Pá–Ne u mě (${t})`, t.slice(1) === "abbaaa");
  ok("noci napůl", n.nociJa + n.nociDruhy === 28 && Math.abs(n.nociJa - n.nociDruhy) <= 2);
}

console.log("── víkendy ──");
{
  const plan = planZVolby("vikendy", "ja", STREDA);
  ok("dvoutýdenní mapa", plan.weeklyMap.length === 14);
  const n = nahledCtyrTydnu(plan, STREDA);
  ok("přes týden u mě", n.tydny[0].slice(0, 4).every((d) => d.strana === "a"));
  ok("tento pátek a sobota u druhého", n.tydny[0][4].strana === "b" && n.tydny[0][5].strana === "b");
  ok("příští víkend u mě", n.tydny[1][4].strana === "a" && n.tydny[1][5].strana === "a");
  ok("většina nocí u mě", n.nociJa > n.nociDruhy && n.nociDruhy >= 3 && n.nociDruhy <= 5);

  const druhy = nahledCtyrTydnu(planZVolby("vikendy", "druhy", STREDA), STREDA);
  ok("přes týden u druhého → víkendy u mě", druhy.tydny[0][1].strana === "b" && druhy.tydny[0][4].strana === "a");
}

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
