/**
 * Rozpad návštěvnosti po hodinách.
 *
 * Denní graf je na krátké okno slepý — kampaň spuštěná v poledne
 * a noční výpadek v něm vypadají stejně. Hodinový rozpad je jediné
 * místo, kde je vidět dnešek, takže se podle něj bude rozhodovat
 * o reklamě. Špatně zařazená hodina znamená špatné rozhodnutí.
 *
 * Spouští se přes `npm run test:provoz-hodiny`.
 */
const { poHodinach } = require("../.test-build/provoz-souhrn.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const TED = new Date("2026-09-11T14:37:00");
const HODINA = 60 * 60 * 1000;
const pred = (ms, navstevnik = "a") => ({
  druh: "zobrazeni",
  created_at: new Date(TED.getTime() - ms).toISOString(),
  navstevnik,
});

console.log("── tvar řady ──");
{
  const h = poHodinach([], TED);
  ok("vždycky 24 hodin", h.length === 24);
  ok("první je nejstarší", h[0].zpet === 23);
  ok("poslední je probíhající", h[23].zpet === 0);
  // Bez prázdných hodin by ze tříhodinové pauzy byla souvislá čára
  // a noc by v grafu vypadala jako den.
  ok("prázdné hodiny zůstávají jako nuly", h.every((x) => x.zobrazeni === 0));
  ok("popisek je celá hodina", /^\d{2}:00$/.test(h[23].popisek));
  ok("poslední popisek je probíhající hodina", h[23].popisek === "14:00");
}

console.log("── zařazení do hodin ──");
{
  const h = poHodinach(
    [
      pred(0), // právě teď
      pred(10 * 60 * 1000), // před 10 minutami, pořád tahle hodina
      pred(45 * 60 * 1000), // 13:52 — předchozí hodina
      pred(3 * HODINA), // 11:37
      pred(23 * HODINA), // včera 15:37
    ],
    TED,
  );
  const podleZpet = Object.fromEntries(h.map((x) => [x.zpet, x.zobrazeni]));
  ok("probíhající hodina má dvě zobrazení", podleZpet[0] === 2);
  ok("před 45 minutami spadne o hodinu zpět", podleZpet[1] === 1);
  ok("před třemi hodinami", podleZpet[3] === 1);
  ok("před 23 hodinami se ještě vejde", podleZpet[23] === 1);
}

console.log("── co se nepočítá ──");
{
  const h = poHodinach(
    [
      pred(25 * HODINA), // starší než okno
      { druh: "registrace", created_at: TED.toISOString(), navstevnik: "b" },
      { druh: "zobrazeni", created_at: "nesmysl", navstevnik: "c" },
    ],
    TED,
  );
  ok("nic se nezapočítalo", h.every((x) => x.zobrazeni === 0));
}

console.log("── návštěvníci se počítají jednou ──");
{
  const h = poHodinach([pred(0, "x"), pred(60 * 1000, "x"), pred(2 * 60 * 1000, "y")], TED);
  const ted = h[23];
  ok("tři zobrazení", ted.zobrazeni === 3);
  ok("dva lidé", ted.navstevnici === 2);
}

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
