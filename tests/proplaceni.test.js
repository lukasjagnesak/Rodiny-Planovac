/**
 * Žádost o proplacení: kdo co smí v kterém stavu.
 *
 * Spouští se přes `npm run test:proplaceni`.
 */
const { akceProplaceni, podilKProplaceni, posledniZadost } = require("../.test-build/lib/proplaceni.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const vydaj = { paid_by: "ja", settled: false, amount: 1234.5, split_percent: 50 };
const z = (stav, pozadal = "ja", created_at = "2026-10-27T10:00:00Z") => ({ stav, pozadal, created_at });
const akce = (o) => akceProplaceni({ vydaj, zadost: null, ja: "ja", jeRodic: true, dvaRodice: true, ...o }).join(",");

ok("podíl na haléře", podilKProplaceni(1234.5, 50) === 617.25);
ok("podíl 30 %", podilKProplaceni(1234.5, 30) === 370.35);

ok("kdo platil, může požádat", akce({}) === "pozadat");
ok("kdo neplatil, nemůže", akce({ vydaj: { ...vydaj, paid_by: "on" } }) === "");
ok("vypořádaný výdaj ne", akce({ vydaj: { ...vydaj, settled: true } }) === "");
ok("nulový podíl ne", akce({ vydaj: { ...vydaj, split_percent: 0 } }) === "");
ok("sám v rodině ne", akce({ dvaRodice: false }) === "");
ok("jen ke čtení ne", akce({ jeRodic: false }) === "");

ok("čeká: žadatel může zrušit", akce({ zadost: z("ceka") }) === "zrusit");
ok("čeká: druhý odpovídá", akce({ zadost: z("ceka", "on") }) === "odpovedet");
ok("schváleno: žadatel potvrdí příjem", akce({ zadost: z("schvaleno") }) === "potvrdit");
ok("schváleno: plátce nic", akce({ zadost: z("schvaleno", "on") }) === "");
ok("rozporováno: žadatel zruší", akce({ zadost: z("rozporovano") }) === "zrusit");
ok("zaplaceno: nic", akce({ zadost: z("zaplaceno"), vydaj: { ...vydaj, settled: true } }) === "");

ok(
  "poslední platná žádost přeskočí zrušené",
  posledniZadost([
    z("rozporovano", "ja", "2026-10-01T00:00:00Z"),
    z("ceka", "ja", "2026-10-05T00:00:00Z"),
    z("zruseno", "ja", "2026-10-09T00:00:00Z"),
  ]).stav === "ceka",
);
ok("bez žádostí null", posledniZadost([]) === null && posledniZadost(undefined) === null);

if (selhalo) {
  console.error(`\n${selhalo} selhalo`);
  process.exit(1);
}
console.log("\nVše v pořádku.");
