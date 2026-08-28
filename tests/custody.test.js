/**
 * Dny versus noci.
 *
 * V kalendáři se zaškrtává, který **den** je dítě u koho. Noc je něco
 * jiného: patří tomu, u koho dítě ten večer usíná. Pobyt od čtvrtka do
 * neděle jsou čtyři dny, ale tři noci — v neděli večer se předává.
 *
 * U střídavé péče se počítají noci a den navíc posune poměr, ze kterého
 * se odvíjí výživné. Proto se to tady hlídá zvlášť.
 *
 * Spouští se přes `npm run test:custody`.
 */
const { custodyStats } = require("../.test-build/custody.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

/** Ze zkratky „aaabbb“ udělá dny, jak je čeká custodyStats. */
const dny = (vzor) =>
  [...vzor].map((z, i) => ({
    key: `2026-03-${String(i + 1).padStart(2, "0")}`,
    side: z === "-" ? null : z,
    isHoliday: false,
  }));

console.log("── pobyt od čtvrtka do neděle ──");
{
  // Čt Pá So Ne u rodiče A, od pondělí u B.
  const s = custodyStats(dny("aaaabbb"));
  ok("čtyři zaškrtnuté dny", s.daysA === 4);
  ok("ale jen tři noci", s.nightsA === 3);
  ok("nedělní noc připadla druhému rodiči", s.nightsB === 3);
}

console.log("── střídání po týdnu ──");
{
  const s = custodyStats(dny("aaaaaaabbbbbbb"));
  ok("sedm dnů u každého", s.daysA === 7 && s.daysB === 7);
  ok("noci se rozdělí 6 : 7", s.nightsA === 6 && s.nightsB === 7);
  ok("součet nocí sedí na počet přechodů", s.nightsA + s.nightsB === s.nightsTotal);
}

console.log("── celky ──");
{
  const s = custodyStats(dny("aaabbbaaa"));
  ok("dnů je tolik, kolik jich přišlo", s.daysA + s.daysB + s.unassigned === s.total);
  ok("nocí je o jednu míň než dnů", s.nightsTotal === s.total - 1);
  ok("procenta se počítají z nocí", s.percentA + s.percentB === 100);
}

console.log("── nepřiřazené dny ──");
{
  const s = custodyStats(dny("aa--bb"));
  ok("prázdné dny se počítají zvlášť", s.unassigned === 2);
  ok("prázdná noc nepřipadne nikomu", s.nightsA + s.nightsB < s.nightsTotal);
}

console.log("── krajní případy ──");
{
  ok("prázdný měsíc nespadne", custodyStats([]).nightsTotal === 0);
  const jeden = custodyStats(dny("a"));
  ok("jediný den nemá noc, kterou by šlo přiřadit", jeden.daysA === 1 && jeden.nightsTotal === 0);
}

console.log("── následující den ──");
{
  const mesic = dny("aaabbb");
  const bez = custodyStats(mesic);
  const s = custodyStats(mesic, { key: "2026-04-01", side: "b", isHoliday: false });
  ok("dnů zůstane stejně", s.daysA === bez.daysA && s.daysB === bez.daysB);
  ok("nocí je o jednu víc", s.nightsTotal === bez.nightsTotal + 1);
  ok("poslední noc připadla podle dalšího dne", s.nightsB === bez.nightsB + 1);
}

console.log("── celý rok se srovná ──");
{
  // Padesát dva střídání po týdnu: rozdíl smí být nanejvýš jedna noc.
  const s = custodyStats(dny("aaaaaaabbbbbbb".repeat(26)));
  ok("po roce je rozdíl nejvýš jedna noc", Math.abs(s.nightsA - s.nightsB) <= 1);
}

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\nSelhalo: ${selhalo}`);
process.exit(selhalo === 0 ? 0 : 1);
