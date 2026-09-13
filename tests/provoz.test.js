/**
 * Výpočty pro dashboard provozu.
 *
 * Špatně spočítaná konverze vede k rozhodnutím o penězích a sama se
 * neprojeví — proto se počítá tady, ne v SQL dotazu na stránce.
 *
 * Spouští se přes `npm run test:provoz`.
 */
const { poDnech, zebricek, trychtyr, kanal } = require("../.test-build/provoz-souhrn.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const u = (druh, cas, navstevnik, extra = {}) => ({
  druh,
  cesta: "/",
  zdroj: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  ref: null,
  zarizeni: "mobil",
  navstevnik,
  created_at: cas,
  ...extra,
});

console.log("── návštěvnost po dnech ──");
{
  const data = [
    u("zobrazeni", "2026-03-01T08:00:00Z", "a"),
    u("zobrazeni", "2026-03-01T09:00:00Z", "a"),
    u("zobrazeni", "2026-03-01T10:00:00Z", "b"),
    u("zobrazeni", "2026-03-03T10:00:00Z", "c"),
  ];
  const dny = poDnech(data, "2026-03-01", "2026-03-03");
  ok("vrátí každý den v období", dny.length === 3);
  ok("dvě zobrazení jednoho člověka = jeden návštěvník", dny[0].navstevnici === 2 && dny[0].zobrazeni === 3);
  ok("den bez provozu je nula, ne díra", dny[1].zobrazeni === 0 && dny[1].den === "2026-03-02");
  ok("poslední den sedí", dny[2].navstevnici === 1);
}
{
  const dny = poDnech([], "2026-03-01", "2026-03-02");
  ok("prázdná data nespadnou", dny.length === 2 && dny[0].zobrazeni === 0);
}

console.log("── žebříček zdrojů ──");
{
  const data = [
    u("zobrazeni", "2026-03-01T08:00:00Z", "a", { zdroj: "google.com" }),
    u("zobrazeni", "2026-03-01T09:00:00Z", "a", { zdroj: "google.com" }),
    u("zobrazeni", "2026-03-01T09:00:00Z", "b", { zdroj: "google.com" }),
    u("zobrazeni", "2026-03-01T10:00:00Z", "c", { zdroj: null }),
    u("lead", "2026-03-01T11:00:00Z", "c", { zdroj: "seznam.cz" }),
  ];
  const z = zebricek(data, (x) => x.zdroj);
  ok("první je nejsilnější zdroj", z[0].nazev === "google.com");
  ok("počítají se lidé, ne kliknutí", z[0].pocet === 2);
  ok("bez odkazu = přímo", z[1].nazev === "přímo");
  ok("konverze do žebříčku návštěv nepatří", z.every((r) => r.nazev !== "seznam.cz"));
  ok("podíly dávají sto procent", Math.round(z.reduce((s, r) => s + r.podil, 0)) === 100);
}

console.log("── trychtýř ──");
{
  const data = [
    ...["a", "b", "c", "d"].map((n) => u("zobrazeni", "2026-03-01T08:00:00Z", n)),
    u("zobrazeni", "2026-03-01T08:30:00Z", "a"),
    u("kalkulacka", "2026-03-01T09:00:00Z", "a"),
    u("kalkulacka", "2026-03-01T09:00:00Z", "b"),
    u("registrace", "2026-03-01T10:00:00Z", "a"),
    u("rodina", "2026-03-01T10:05:00Z", "a"),
    u("predplatne", "2026-03-02T10:00:00Z", null),
  ];
  const t = trychtyr(data);
  ok("vrchol jsou návštěvníci, ne zobrazení", t[0].pocet === 4);
  ok("druhý krok sedí", t[1].klic === "kalkulacka" && t[1].pocet === 2);
  ok("konverze z předchozího kroku", t[1].zPredchoziho === 50);
  ok("krok bez události je nula", t.find((k) => k.klic === "druhy_rodic").pocet === 0);
  ok("platba se počítá i bez otisku", t[5].pocet === 1);
  ok("podíl z vrcholu je z návštěv", t[2].zVrcholu === 25);
}
{
  const t = trychtyr([]);
  ok("prázdná data nedělí nulou", t.every((k) => k.pocet === 0 && k.zPredchoziho === 0));
}

console.log("── kanál ──");
{
  ok("partner má přednost", kanal(u("zobrazeni", "", "a", { ref: "advokat-novak", utm_source: "google" })) === "partner: advokat-novak");
  ok("utm se spojí s médiem", kanal(u("zobrazeni", "", "a", { utm_source: "seznam", utm_medium: "cpc" })) === "seznam / cpc");
  ok("jinak doména odkazu", kanal(u("zobrazeni", "", "a", { zdroj: "idnes.cz" })) === "idnes.cz");
  ok("nic z toho = null", kanal(u("zobrazeni", "", "a")) === null);
}

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\nSelhalo: ${selhalo}`);
process.exit(selhalo === 0 ? 0 : 1);
