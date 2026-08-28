/**
 * Výpočet výživného podle doporučující tabulky MSp.
 *
 * Kalkulačka výživného je vstupní stránka z vyhledávače a lidé podle ní
 * jdou k soudu nebo k mediátorovi. Když spočítá blbost, ublíží to konkrétní
 * rodině — proto se tady kontroluje i to, co se zdá samozřejmé.
 *
 * Spouští se přes `npm run test:vyzivne`.
 */
const {
  spocitejVyzivne,
  najdiEtapu,
  ETAPY,
  KOEFICIENT_POVINNOSTI,
  VYCHOZI_VYZIVNE,
} = require("../.test-build/vyzivne.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const vstup = (zmeny = {}) => ({ ...VYCHOZI_VYZIVNE, ...zmeny });

console.log("── tabulka etap ──");
ok("čtyři etapy", ETAPY.length === 4);
ok(
  "rozpětí rostou s věkem",
  ETAPY.every((e, i) => i === 0 || e.od > ETAPY[i - 1].od),
);
ok("neznámá etapa spadne na 2. stupeň", najdiEtapu("nesmysl").id === "druhy-stupen");

console.log("── rovnováha ──");
{
  const v = spocitejVyzivne(vstup({ prijemA: 40000, prijemB: 40000, peceA: 50 }));
  ok("stejné příjmy a půl na půl → bez výživného", v.bezVyzivneho && v.platce === null);
}
{
  const v = spocitejVyzivne(vstup({ prijemA: 40000, prijemB: 40000, peceA: 100 }));
  ok("stejné příjmy, dítě jen u A → platí B", !v.bezVyzivneho && v.platce === "b");
}
{
  const v = spocitejVyzivne(vstup({ prijemA: 40000, prijemB: 40000, peceA: 0 }));
  ok("stejné příjmy, dítě jen u B → platí A", !v.bezVyzivneho && v.platce === "a");
}

console.log("── směr platby ──");
{
  const v = spocitejVyzivne(vstup({ prijemA: 80000, prijemB: 25000, peceA: 50 }));
  ok("při střídavce platí ten s vyšším příjmem", v.platce === "a");
  const opacne = spocitejVyzivne(vstup({ prijemA: 25000, prijemB: 80000, peceA: 50 }));
  ok("obrácené zadání dá zrcadlový výsledek", opacne.platce === "b" && opacne.castka === v.castka);
}

console.log("── výše ──");
{
  // 2. stupeň = 15–19 %, střed 17 %. Jedna povinnost, péče půl na půl:
  // (80000 − 25000) × 0,17 × 1 × 0,5 = 4675 → 4680 po zaokrouhlení.
  const v = spocitejVyzivne(vstup({ prijemA: 80000, prijemB: 25000, peceA: 50 }));
  ok("ruční výpočet sedí (4680 Kč)", v.castka === 4680);
  ok("rozpětí obklopuje výsledek", v.rozpeti.od <= v.castka && v.castka <= v.rozpeti.do);
  ok("rozpětí odpovídá tabulce", v.procenta.od === 15 && v.procenta.do === 19);
}
{
  const jedno = spocitejVyzivne(vstup({ prijemA: 80000, prijemB: 25000, povinnosti: 1 }));
  const dve = spocitejVyzivne(vstup({ prijemA: 80000, prijemB: 25000, povinnosti: 2 }));
  ok(
    "druhé dítě sníží výživné na první koeficientem",
    Math.abs(dve.castka - jedno.castka * KOEFICIENT_POVINNOSTI[2]) <= 10,
  );
}
{
  const a = spocitejVyzivne(vstup({ etapa: "predskolni", prijemA: 80000, prijemB: 25000 }));
  const b = spocitejVyzivne(vstup({ etapa: "stredni", prijemA: 80000, prijemB: 25000 }));
  ok("starší dítě vyjde dráž", b.castka > a.castka);
}
{
  const rovnomerne = spocitejVyzivne(vstup({ prijemA: 80000, prijemB: 25000, peceA: 50 }));
  const vic = spocitejVyzivne(vstup({ prijemA: 80000, prijemB: 25000, peceA: 75 }));
  ok("víc péče u platícího rodiče výživné sníží", vic.castka < rovnomerne.castka);
}

console.log("── odolnost zadání ──");
{
  const v = spocitejVyzivne(vstup({ prijemA: -5000, prijemB: 30000, peceA: 50 }));
  ok("záporný příjem se bere jako nula", v.platce === "b");
}
{
  const v = spocitejVyzivne(vstup({ peceA: 380 }));
  const kraj = spocitejVyzivne(vstup({ peceA: 100 }));
  ok("péče nad 100 % se ořízne", v.castka === kraj.castka && v.platce === kraj.platce);
}
{
  const v = spocitejVyzivne(vstup({ povinnosti: 9, prijemA: 80000, prijemB: 25000 }));
  const ctyri = spocitejVyzivne(vstup({ povinnosti: 4, prijemA: 80000, prijemB: 25000 }));
  ok("víc než čtyři povinnosti spadne na čtyři", v.castka === ctyri.castka);
}
{
  const v = spocitejVyzivne(vstup({ prijemA: Number.NaN, prijemB: Number.NaN }));
  ok("nečíselné zadání nespadne", v.bezVyzivneho && v.castka === 0);
}
{
  // Rozdíl pod 200 Kč se nemá vydávat za výživné.
  const v = spocitejVyzivne(vstup({ prijemA: 40000, prijemB: 39000, peceA: 50 }));
  ok("zanedbatelný rozdíl → bez výživného", v.bezVyzivneho);
}
{
  const v = spocitejVyzivne(vstup({ prijemA: 80000, prijemB: 25000 }));
  ok("částka je na desetikoruny", v.castka % 10 === 0);
}

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\nSelhalo: ${selhalo}`);
process.exit(selhalo === 0 ? 0 : 1);
