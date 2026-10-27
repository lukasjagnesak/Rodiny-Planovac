/** Historie změn — seskupení a výpis. Spouští se přes `npm run test:historie`. */
const { poDnech, vypisHistorie, casZaznamu } = require("../.test-build/lib/historie.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const z = (id, kdy, popis, oblast = "vydaje") => ({ id, family_id: "f", kdo: "u", kdo_jmeno: "Petr", kdy, oblast, popis, zaznam_id: null });
// Nejnovější nahoře, jak je vrací databáze
const zaznamy = [
  z(3, "2026-10-27T13:05:00Z", "Výdaj: Bunda, 1 890 Kč"),
  z(2, "2026-10-27T08:00:00Z", "Výjimka v rozvrhu", "rozvrh"),
  z(1, "2026-10-26T22:30:00Z", "Nový kroužek: Plavání", "krouzky"), // 23:30 v Praze, ještě 26.
];

const dny = poDnech(zaznamy);
ok("dva dny", dny.length === 2);
ok("dnešek první", dny[0].den === "27. 10. 2026" && dny[0].zaznamy.length === 2);
ok("pražský čas", casZaznamu("2026-10-27T13:05:00Z") === "14:05");

const vypis = vypisHistorie(zaznamy, "Dvořákovi");
const texty = vypis.map((o) => o.text);
ok("nadpis s rodinou", texty[0] === "Historie změn — Dvořákovi");
ok("od nejstaršího", texty.findIndex((t) => t.includes("Plavání")) < texty.findIndex((t) => t.includes("Bunda")));
ok("u záznamu čas a kdo", texty.some((t) => t === "14:05 — Petr: Výdaj: Bunda, 1 890 Kč"));
ok("prázdná historie", vypisHistorie([], "X").length === 2);

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
