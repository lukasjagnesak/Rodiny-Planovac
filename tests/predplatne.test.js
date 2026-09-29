/**
 * Rozhodnutí, co rodina smí.
 *
 * Chyba na obě strany je drahá: buď nechá zapisovat toho, kdo nezaplatil,
 * nebo zamkne rodinu, která platí. Druhé je horší — rodič, který ze dne
 * na den přijde o kalendář dětí, se nevrátí.
 *
 * Spouští se přes `npm run test:predplatne`.
 */
const { vyhodnot } = require("../.test-build/predplatne-pravidla.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const zaDni = (n) => new Date(Date.now() + n * 86400000).toISOString();
const p = (stav, dni) => ({
  family_id: "f1",
  stav,
  plati_do: zaDni(dni),
  stripe_customer_id: null,
  stripe_subscription_id: null,
  tarif: null,
});

console.log("── běžící zkušební období ──");
{
  const v = vyhodnot(p("zkusebni", 30));
  ok("smí zapisovat", v.muzeZapisovat);
  ok("ví, že je zkušební", v.jeZkusebni);
  ok("na začátku neotravuje", v.upozorneni === null);
}
{
  const v = vyhodnot(p("zkusebni", 5));
  ok("týden před koncem upozorní", v.upozorneni !== null && v.upozorneni.includes("5 dní"));
  ok("ale pořád se zapisuje", v.muzeZapisovat);
}
{
  ok("poslední den má vlastní hlášku", vyhodnot(p("zkusebni", 1)).upozorneni === "Zkušební období končí dnes.");
  ok("dva dny mají správný tvar", vyhodnot(p("zkusebni", 2)).upozorneni.includes("2 dny"));
}

console.log("── zkušební období doběhlo ──");
{
  const v = vyhodnot(p("zkusebni", -1));
  ok("zápis se zamkne", !v.muzeZapisovat);
  ok("čtení zůstává — v hlášce je to napsané", v.upozorneni.includes("číst zůstává"));
}

console.log("── zaplaceno ──");
{
  const v = vyhodnot(p("aktivni", 20));
  ok("smí zapisovat", v.muzeZapisovat);
  ok("neupozorňuje", v.upozorneni === null);
}
{
  // Platí i tehdy, když se datum konce ještě nestihlo posunout.
  const v = vyhodnot(p("aktivni", -1));
  ok("aktivní předplatné se nezamyká kvůli datu", v.muzeZapisovat);
}

console.log("── platba neprošla ──");
{
  const v = vyhodnot(p("po_splatnosti", -2));
  ok("pořád se smí zapisovat", v.muzeZapisovat);
  ok("ale upozorní na kartu", v.upozorneni.includes("kartu"));
}

console.log("── zrušeno ──");
{
  const doBehu = vyhodnot(p("zruseno", 12));
  ok("do konce zaplaceného období se zapisuje", doBehu.muzeZapisovat);
  const po = vyhodnot(p("zruseno", -1));
  ok("po jeho konci už ne", !po.muzeZapisovat);
  ok("hláška mluví o předplatném, ne o zkušebním", po.upozorneni.includes("Předplatné"));
}

console.log("── krajní případy ──");
{
  const v = vyhodnot(null);
  ok("rodina bez záznamu se nezamyká", v.muzeZapisovat);
  ok("a neotravuje se hláškou", v.upozorneni === null);
}

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\nSelhalo: ${selhalo}`);
process.exit(selhalo === 0 ? 0 : 1);
