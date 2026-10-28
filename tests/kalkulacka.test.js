/**
 * Výpočty pro veřejnou kalkulačku.
 *
 * Kalkulačka je první věc, kterou o produktu člověk uvidí — když jí
 * vyjde něco jiného než aplikaci, je to horší, než kdyby nebyla.
 * Proto se tady hlídá hlavně to, že počítá stejným kódem.
 *
 * Spouští se přes `npm run test:kalkulacka`.
 */
const {
  spocitejPlan,
  vzorZPlanu,
  zkontrolujVstup,
  nejblizsiPredani,
  VYCHOZI_VSTUP,
} = require("../.test-build/kalkulacka.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const vstup = (zmeny = {}) => ({
  ...VYCHOZI_VSTUP,
  anchorDate: "2026-01-05",
  ...zmeny,
});

console.log("── kontrola zadání ──");
ok("bez data se nepočítá", zkontrolujVstup({ ...VYCHOZI_VSTUP }) !== null);
ok("s datem projde", zkontrolujVstup(vstup()) === null);
ok(
  "vlastní rozpis musí mít 7 nebo 14 dnů",
  zkontrolujVstup(vstup({ kind: "custom_weekly", weeklyMap: "aab" })) !== null,
);
ok(
  "čtrnáctidenní rozpis projde",
  zkontrolujVstup(vstup({ kind: "custom_weekly", weeklyMap: "aabbaabbbaabba" })) === null,
);
ok("nesmyslný počet dětí neprojde", zkontrolujVstup(vstup({ pocetDeti: 9 })) !== null);

console.log("── vzor ──");
let vzor = vzorZPlanu(vstup({ kind: "iso_week_parity" }));
ok("u parity se rozpis dnů neukládá", vzor.weekly_map === null);
vzor = vzorZPlanu(vstup({ kind: "custom_weekly", weeklyMap: "aabbaab" }));
ok("u vlastního rozpisu se ukládá", vzor.weekly_map === "aabbaab");
vzor = vzorZPlanu(vstup({ kind: "fixed_parent", anchorSide: "b" }));
ok("u trvalé péče sedí strana", vzor.fixed_side === "b");

console.log("── výpočet roku ──");
// 2026 začíná čtvrtkem; počítá se od začátku aktuálního měsíce.
const dnes = new Date(2026, 0, 15);
let v = spocitejPlan(vstup({ kind: "iso_week_parity" }), dnes);
ok("vyjde dvanáct měsíců", v.mesice.length === 12);
ok(
  "součet nocí sedí na délku roku",
  v.rokNociA + v.rokNociB === v.mesice.reduce((s, m) => s + m.nociA + m.nociB, 0),
);
ok("rok má 365 nebo 366 nocí", [365, 366].includes(v.rokNociA + v.rokNociB));
ok("u sudých a lichých týdnů je to skoro půl na půl", Math.abs(v.procentA - v.procentB) <= 2);
ok("procenta dávají sto", v.procentA + v.procentB === 100);

// Trvalá péče u jednoho rodiče — druhá strana musí zůstat na nule.
v = spocitejPlan(vstup({ kind: "fixed_parent", anchorSide: "a" }), dnes);
ok("u trvalé péče má druhá strana nula nocí", v.rokNociB === 0);
ok("u trvalé péče není co předávat", nejblizsiPredani(v, dnes) === null);

// 2-2-3 se opakuje po dvou týdnech, takže poměr taky sedí.
v = spocitejPlan(vstup({ kind: "week_2_2_3" }), dnes);
ok("schéma 2-2-3 je vyvážené", Math.abs(v.procentA - v.procentB) <= 4);

// Vlastní rozpis: pět dnů u A, dva u B.
v = spocitejPlan(vstup({ kind: "custom_weekly", weeklyMap: "aaaaabb" }), dnes);
ok(
  "vlastní rozpis 5:2 vyjde zhruba 71 % ku 29 %",
  Math.abs(v.procentA - 71) <= 1 && Math.abs(v.procentB - 29) <= 1,
);

console.log("── nejbližší předání ──");
v = spocitejPlan(vstup({ kind: "alternating_weeks" }), dnes);
const predani = nejblizsiPredani(v, dnes);
ok("předání se najde", predani !== null);
ok("předání není v minulosti", predani.den >= "2026-01-15");
ok(
  "u střídání po týdnu je předání do sedmi dnů",
  predani.den <= "2026-01-22",
);

console.log("── nejbližší pobyty ──");
ok(
  "seznam pobytů nezačíná v minulosti",
  v.bloky.length > 0 && v.bloky.every((b) => b.endKey >= "2026-01-15"),
);

console.log(selhalo === 0 ? "\n=== VŠE PROŠLO ===" : `\n=== ${selhalo} SELHALO ===`);
process.exit(selhalo === 0 ? 0 : 1);
