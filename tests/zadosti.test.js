/**
 * Žádosti o změnu rozvrhu: kdy se schvaluje a co se předvyplní.
 *
 * Spouští se přes `npm run test:zadosti`.
 */
const { maDvaRodice, rozsahDnu, vychoziTerminOdpovedi } = require("../.test-build/lib/zadosti.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const m = (userId, side, role = "parent") => ({ userId, side, role });

console.log("── dva rodiče ──");
ok("sám rodič: zapisuje přímo", !maDvaRodice([m("a", "a", "owner")]));
ok("dva rodiče: schvaluje se", maDvaRodice([m("a", "a", "owner"), m("b", "b")]));
ok("babička bez strany se nepočítá", !maDvaRodice([m("a", "a", "owner"), m("c", null, "guardian")]));
ok("opatrovník se stranou se nepočítá (jako v databázi)", !maDvaRodice([m("a", "a", "owner"), m("c", "b", "guardian")]));
ok("jen pro čtení se nepočítá", !maDvaRodice([m("a", "a", "owner"), m("v", "b", "viewer")]));

console.log("── rozsah ──");
ok("jeden den", rozsahDnu("2026-11-06", "2026-11-06") === "6. 11.");
ok("víc dnů", rozsahDnu("2026-11-06", "2026-11-08") === "6. 11.–8. 11.");

console.log("── termín odpovědi ──");
ok("daleko dopředu: za dva dny", vychoziTerminOdpovedi("2026-11-20", "2026-11-01") === "2026-11-03");
ok("brzy: den před změnou", vychoziTerminOdpovedi("2026-11-03", "2026-11-01") === "2026-11-02");
ok("zítra: dnes", vychoziTerminOdpovedi("2026-11-02", "2026-11-01") === "2026-11-01");
ok("dnes: dnes", vychoziTerminOdpovedi("2026-11-01", "2026-11-01") === "2026-11-01");
ok("přes konec měsíce", vychoziTerminOdpovedi("2026-12-15", "2026-11-30") === "2026-12-02");

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
