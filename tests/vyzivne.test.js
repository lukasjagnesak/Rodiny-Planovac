/**
 * Výpočet výživného podle doporučující tabulky MSp.
 *
 * Kalkulačka je vstupní stránka z vyhledávače a lidé podle ní jdou k soudu
 * nebo k mediátorovi. Když spočítá blbost, ublíží to konkrétní rodině —
 * proto se tady kontroluje i to, co se zdá samozřejmé.
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
/** Zkratka: ze seznamu etap udělá děti. */
const deti = (...etapy) => etapy.map((etapa) => ({ etapa }));

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

console.log("── směr platby ──");
{
  const v = spocitejVyzivne(vstup({ prijemA: 80000, prijemB: 25000 }));
  ok("při střídavce platí ten s vyšším příjmem", v.platce === "a");
  const opacne = spocitejVyzivne(vstup({ prijemA: 25000, prijemB: 80000 }));
  ok("obrácené zadání dá zrcadlový výsledek", opacne.platce === "b" && opacne.castka === v.castka);
}

console.log("── jedno dítě, ruční výpočet ──");
{
  // 2. stupeň = 15–19 %, střed 17 %. Jedna povinnost, péče půl na půl:
  // (80000 − 25000) × 0,17 × 1 × 0,5 = 4675 → 4680 po zaokrouhlení.
  const v = spocitejVyzivne(vstup({ prijemA: 80000, prijemB: 25000 }));
  ok("sedí na 4680 Kč", v.castka === 4680);
  ok("rozpětí obklopuje výsledek", v.rozpeti.od <= v.castka && v.castka <= v.rozpeti.do);
  ok("jedno dítě v rozpadu", v.podleDeti.length === 1);
}

console.log("── víc společných dětí ──");
{
  const jedno = spocitejVyzivne(vstup({ deti: deti("druhy-stupen"), prijemA: 80000, prijemB: 25000 }));
  const dve = spocitejVyzivne(
    vstup({ deti: deti("druhy-stupen", "druhy-stupen"), prijemA: 80000, prijemB: 25000 }),
  );
  ok("dvě děti stojí víc než jedno", dve.castka > jedno.castka);
  ok(
    "ale ne dvojnásobek — koeficient podíl na dítě snižuje",
    dve.castka < jedno.castka * 2,
  );
  ok("rozpad má dvě položky", dve.podleDeti.length === 2);
  ok(
    "součet rozpadu odpovídá celku",
    Math.abs(dve.podleDeti.reduce((s, d) => s + d.castka, 0) - dve.castka) <= 20,
  );
  ok("obě děti počítají dvě povinnosti", dve.povinnostiA === 2 && dve.povinnostiB === 2);
}
{
  const stejne = spocitejVyzivne(
    vstup({ deti: deti("predskolni", "predskolni"), prijemA: 80000, prijemB: 25000 }),
  );
  const ruzne = spocitejVyzivne(
    vstup({ deti: deti("predskolni", "stredni"), prijemA: 80000, prijemB: 25000 }),
  );
  ok("starší sourozenec zvýší částku", ruzne.castka > stejne.castka);
  ok(
    "starší dítě má v rozpadu vyšší podíl",
    ruzne.podleDeti[1].castka > ruzne.podleDeti[0].castka,
  );
}

console.log("── děti z jiného vztahu ──");
{
  const bez = spocitejVyzivne(vstup({ prijemA: 80000, prijemB: 25000 }));
  const sDitetem = spocitejVyzivne(vstup({ prijemA: 80000, prijemB: 25000, dalsiDetiA: 1 }));
  ok("další dítě platícího rodiče výživné sníží", sDitetem.castka < bez.castka);
  ok("povinnosti se sečtou", sDitetem.povinnostiA === 2 && sDitetem.povinnostiB === 1);
  // Koeficient snižuje povinnost **toho rodiče**, ne výsledný rozdíl.
  // (80000 × 0,17 × 0,80 − 25000 × 0,17 × 1) × 0,5 = 3315 → 3320.
  ok("sedí na ručním výpočtu 3320 Kč", sDitetem.castka === 3320);
  ok(
    "není to celková částka krát koeficient",
    sDitetem.castka !== Math.round((bez.castka * KOEFICIENT_POVINNOSTI[2]) / 10) * 10,
  );
}
{
  const uPrijemce = spocitejVyzivne(vstup({ prijemA: 80000, prijemB: 25000, dalsiDetiB: 1 }));
  const bez = spocitejVyzivne(vstup({ prijemA: 80000, prijemB: 25000 }));
  ok("další dítě přijímajícího rodiče výživné zvýší", uPrijemce.castka > bez.castka);
  ok("každý rodič má vlastní počet povinností", uPrijemce.povinnostiA === 1 && uPrijemce.povinnostiB === 2);
}

console.log("── odolnost zadání ──");
{
  const v = spocitejVyzivne(vstup({ prijemA: -5000, prijemB: 30000 }));
  ok("záporný příjem se bere jako nula", v.platce === "b");
}
{
  const v = spocitejVyzivne(vstup({ peceA: 380 }));
  const kraj = spocitejVyzivne(vstup({ peceA: 100 }));
  ok("péče nad 100 % se ořízne", v.castka === kraj.castka && v.platce === kraj.platce);
}
{
  const v = spocitejVyzivne(vstup({ dalsiDetiA: 9, prijemA: 80000, prijemB: 25000 }));
  ok("povinnosti se zastropují na čtyřech", v.povinnostiA === 4);
}
{
  const v = spocitejVyzivne(vstup({ deti: [], prijemA: 80000, prijemB: 25000 }));
  ok("prázdný seznam dětí spadne na jedno", v.podleDeti.length === 1);
}
{
  const v = spocitejVyzivne(vstup({ deti: deti(...Array(12).fill("druhy-stupen")) }));
  ok("víc než šest dětí se ořízne", v.podleDeti.length === 6);
}
{
  const v = spocitejVyzivne(vstup({ prijemA: Number.NaN, prijemB: Number.NaN }));
  ok("nečíselné zadání nespadne", v.bezVyzivneho && v.castka === 0);
}
{
  const v = spocitejVyzivne(vstup({ prijemA: 40000, prijemB: 39000 }));
  ok("zanedbatelný rozdíl → bez výživného", v.bezVyzivneho);
}
{
  const v = spocitejVyzivne(vstup({ prijemA: 80000, prijemB: 25000 }));
  ok("částka je na desetikoruny", v.castka % 10 === 0);
}

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\nSelhalo: ${selhalo}`);
process.exit(selhalo === 0 ? 0 : 1);
