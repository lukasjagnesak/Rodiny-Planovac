/**
 * Vyrovnání výdajů: kdo komu dluží a kdo smí potvrdit zaplacení.
 *
 * Spouští se přes `npm run test:vyrovnani`.
 */
const { rozpisDluhu, smimVyrovnat, maZivouZadost } = require("../.test-build/lib/vyrovnani.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const v = (id, paid_by, amount, split_percent, spent_on, extra = {}) => ({
  id, paid_by, amount, split_percent, spent_on, settled: false, ...extra,
});

const vydaje = [
  v("a", "ja", 1000, 40, "2026-09-27"), // druhý mi dluží 400
  v("b", "ja", 1180, 50, "2026-10-29"), // druhý mi dluží 590
  v("c", "on", 3200, 50, "2026-10-31"), // dlužím 1600
  v("d", "on", 500, 0, "2026-10-01"), // nic — nese to celé on
  v("e", "ja", 800, 50, "2026-08-01", { settled: true }), // vyrovnané
  v("f", null, 300, 50, "2026-10-02"), // neznámý plátce
];
const r = rozpisDluhu(vydaje, "ja");

ok("dluží mi dvě položky, i ze září", r.mneDluzi.map((p) => p.expense.id).join() === "a,b");
ok("podíl 60/40 počítá 40 % druhého", r.mneDluzi[0].podil === 400);
ok("dlužím jednu položku", r.dluzim.length === 1 && r.dluzim[0].podil === 1600);
ok("součty", r.mneDluziCelkem === 990 && r.dluzimCelkem === 1600);
ok("saldo: mám doplatit 610", r.saldo === -610);
ok("nulový podíl ani vyrovnané se nepočítají", !r.dluzim.some((p) => p.expense.id === "d"));

ok("svůj výdaj vyrovnat smím", smimVyrovnat(vydaje[0], "ja", true));
ok("cizí výdaj při dvou rodičích ne", !smimVyrovnat(vydaje[2], "ja", true));
ok("sám v rodině smím všechno", smimVyrovnat(vydaje[2], "ja", false));
const sZadosti = v("g", "ja", 600, 50, "2026-10-30", {
  zadosti_proplaceni: [{ stav: "ceka", created_at: "2026-10-30T10:00:00Z" }],
});
ok("s rozběhnutou žádostí ne", maZivouZadost(sZadosti) && !smimVyrovnat(sZadosti, "ja", true));

if (selhalo) {
  console.error(`\n${selhalo} selhalo`);
  process.exit(1);
}
console.log("\nVše v pořádku.");
