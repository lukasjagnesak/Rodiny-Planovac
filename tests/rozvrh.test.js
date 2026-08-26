/**
 * Skládání rozvrhu ze staženého EduPage a počítání nad ním.
 *
 * Sudý a lichý týden je tady to zrádné místo — proto je na něj většina
 * případů. Bez testu se chyba pozná až tím, že dítě čeká před školou.
 */
// Spouští se přes `npm run test:rozvrh` — skript nejdřív přeloží
// src/lib/rozvrh.ts do .test-build/ a pak sáhne sem.
const {
  slozRozvrh,
  hodinyDne,
  konecVyucovani,
  paritaPlati,
  denVTydnu,
  hodinTydne,
} = require("../.test-build/rozvrh.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const h = (den, tyden, poradi, predmet, zacatek = "08:00", konec = "08:45") => ({
  den, tyden, poradi, predmet, ucebna: null, ucitel: null, zacatek, konec,
});

console.log("── slozRozvrh ──");

// 1) Jediný pozorovaný týden → nic se nerozděluje na sudý/lichý.
let r = slozRozvrh([h(1, 35, 1, "Matematika"), h(1, 35, 2, "Čeština")]);
ok("jeden týden → vše 'vzdy'", r.length === 2 && r.every((x) => x.parita === "vzdy"));

// 2) Dva týdny, stejný předmět → jeden řádek 'vzdy'.
r = slozRozvrh([h(1, 34, 1, "Matematika"), h(1, 35, 1, "Matematika")]);
ok("shodné týdny → jeden řádek 'vzdy'", r.length === 1 && r[0].parita === "vzdy");

// 3) Dva týdny, různý předmět → sudý a lichý zvlášť.
r = slozRozvrh([h(1, 34, 1, "Dílny"), h(1, 35, 1, "Vaření")]);
ok("odlišné týdny → dva řádky", r.length === 2);
ok("sudý týden 34 → Dílny", r.find((x) => x.parita === "sudy")?.predmet === "Dílny");
ok("lichý týden 35 → Vaření", r.find((x) => x.parita === "lichy")?.predmet === "Vaření");

// 4) Hodina jen v jednom z pozorovaných týdnů → patří tomu týdnu.
r = slozRozvrh([h(1, 34, 6, "Kroužek"), h(1, 35, 1, "Matematika")]);
ok("hodina jen v sudém týdnu → 'sudy'", r.find((x) => x.poradi === 6)?.parita === "sudy");

// 5) Stejný předmět, ale jiná učebna → rozdělí se.
r = slozRozvrh([
  { ...h(1, 34, 1, "Tělocvik"), ucebna: "Hala" },
  { ...h(1, 35, 1, "Tělocvik"), ucebna: "Bazén" },
]);
ok("jiná učebna → dva řádky", r.length === 2);

// 6) Řazení podle dne a pořadí.
r = slozRozvrh([h(3, 34, 2, "B"), h(1, 34, 5, "A")]);
ok("seřazeno podle dne", r[0].den === 1 && r[1].den === 3);

console.log("── výpočty nad rozvrhem ──");

// Pondělí 1. 9. 2025 je ISO týden 36 (sudý).
const pondeli = new Date(2025, 8, 1);
ok("denVTydnu(pondělí) = 1", denVTydnu(pondeli) === 1);
ok("denVTydnu(neděle) = 7", denVTydnu(new Date(2025, 8, 7)) === 7);
ok("parita 'vzdy' platí vždy", paritaPlati("vzdy", pondeli));
ok("v sudém týdnu neplatí lichá hodina", paritaPlati("lichy", pondeli) === false);
ok("v sudém týdnu platí sudá hodina", paritaPlati("sudy", pondeli) === true);

const rozvrh = [
  { id: "1", den: 1, poradi: 1, predmet: "M", zacatek: "08:00:00", konec: "08:45:00", parita: "vzdy" },
  { id: "2", den: 1, poradi: 5, predmet: "Tv", zacatek: "11:50:00", konec: "12:35:00", parita: "vzdy" },
  { id: "3", den: 1, poradi: 6, predmet: "Dílny", zacatek: "12:45:00", konec: "13:30:00", parita: "lichy" },
];
ok("hodinyDne v sudém týdnu vynechá lichou hodinu", hodinyDne(rozvrh, pondeli).length === 2);
ok("konec vyučování v sudém týdnu", konecVyucovani(rozvrh, pondeli) === "12:35");
// Pondělí 8. 9. 2025 je ISO týden 37 (lichý).
const dalsiPondeli = new Date(2025, 8, 8);
ok("v lichém týdnu se přidají dílny", konecVyucovani(rozvrh, dalsiPondeli) === "13:30");
ok("den bez hodin → null", konecVyucovani(rozvrh, new Date(2025, 8, 6)) === null);
ok("hodinTydne: 2 stálé + průměr sudý/lichý", hodinTydne(rozvrh) === 3);

console.log(selhalo === 0 ? "\n=== VŠE PROŠLO ===" : `\n=== ${selhalo} SELHALO ===`);
process.exit(selhalo === 0 ? 0 : 1);
