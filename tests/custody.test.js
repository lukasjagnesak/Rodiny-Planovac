/**
 * Dny a noci v kalendáři.
 *
 * Zaškrtnutý den se počítá jako jedna noc. Zkoušel jsem noci odvozovat
 * posunem o den, ale vycházelo z toho víc nocí než dnů — což je nesmysl.
 * Rozdíl mezi dnem a nocí nejde z dat spolehlivě odvodit, dokud kalendář
 * neumí zapsat, **kdy** se předává. Tenhle test hlídá hlavně to, že se
 * takové číslo nemůže vrátit.
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

console.log("── dny a noci ──");
{
  // Zaškrtnutý den = jedna noc. Rozdíl mezi dnem a nocí nejde odvodit,
  // dokud kalendář neumí zapsat, kdy se předává — a číslo, kterému se
  // nedá věřit, je horší než jednoduché pravidlo.
  const s = custodyStats(dny("aaaabbb"));
  ok("čtyři dny u A", s.daysA === 4);
  ok("noci se rovnají dnům", s.nightsA === s.daysA && s.nightsB === s.daysB);
  ok("nikdy víc nocí než dnů", s.nightsA <= s.daysA && s.nightsB <= s.daysB);
}

console.log("── střídání po týdnu ──");
{
  const s = custodyStats(dny("aaaaaaabbbbbbb"));
  ok("sedm dnů u každého", s.daysA === 7 && s.daysB === 7);
  ok("a sedm nocí u každého", s.nightsA === 7 && s.nightsB === 7);
  ok("součet nocí sedí", s.nightsA + s.nightsB === s.nightsTotal);
}

console.log("── celky ──");
{
  const s = custodyStats(dny("aaabbbaaa"));
  ok("dnů je tolik, kolik jich přišlo", s.daysA + s.daysB + s.unassigned === s.total);
  ok("procenta se dopočítávají do sta", s.percentA + s.percentB === 100);
}

console.log("── nepřiřazené dny ──");
{
  const s = custodyStats(dny("aa--bb"));
  ok("prázdné dny se počítají zvlášť", s.unassigned === 2);
  ok("prázdné dny se nepočítají do nocí", s.nightsA + s.nightsB === 4);
}

console.log("── krajní případy ──");
{
  ok("prázdný měsíc nespadne", custodyStats([]).nightsTotal === 0);
  const jeden = custodyStats(dny("a"));
  ok("jediný den je jedna noc", jeden.daysA === 1 && jeden.nightsA === 1);
}

console.log("── následující den nic nerozhodí ──");
{
  const mesic = dny("aaabbb");
  const bez = custodyStats(mesic);
  const s = custodyStats(mesic, { key: "2026-04-01", side: "b", isHoliday: false });
  ok("dny zůstanou stejné", s.daysA === bez.daysA && s.daysB === bez.daysB);
  ok("noci zůstanou stejné", s.nightsA === bez.nightsA && s.nightsB === bez.nightsB);
}

console.log("── celý rok se srovná ──");
{
  // Padesát dva střídání po týdnu: rozdíl smí být nanejvýš jedna noc.
  const s = custodyStats(dny("aaaaaaabbbbbbb".repeat(26)));
  ok("po roce vyjde rovnoměrné střídání nastejno", s.nightsA === s.nightsB);
}

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\nSelhalo: ${selhalo}`);
process.exit(selhalo === 0 ? 0 : 1);
