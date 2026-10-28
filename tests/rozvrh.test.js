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
  zacatekVyucovani,
  paritaPlati,
  denVTydnu,
  hodinTydne,
  zmenyZPozorovani,
  hodinyDneSeZmenami,
} = require("../.test-build/rozvrh.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

// Pondělí týdne 34 je 18. 8. 2025, týdne 35 pak 25. 8. 2025.
const DATUM = { 34: "2025-08-18", 35: "2025-08-25" };

// Čas se odvíjí od pořadí, protože tak to má i skutečná škola: dvě
// hodiny téhož dne nezačínají naráz. Slot se přes týdny páruje právě
// podle času, takže na shodném čase u všech hodin by test neseděl
// s ničím, co se může doopravdy stát.
const h = (den, tyden, poradi, predmet, extra = {}) => ({
  den,
  tyden,
  datum: DATUM[tyden] ?? "2025-08-18",
  poradi,
  predmet,
  ucebna: null,
  ucitel: null,
  zacatek: `${String(7 + poradi).padStart(2, "0")}:00`,
  konec: `${String(7 + poradi).padStart(2, "0")}:45`,
  ...extra,
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
  h(1, 34, 1, "Tělocvik", { ucebna: "Hala" }),
  h(1, 35, 1, "Tělocvik", { ucebna: "Bazén" }),
]);
ok("jiná učebna → dva řádky", r.length === 2);

// 6) Řazení podle dne a pořadí.
r = slozRozvrh([h(3, 34, 2, "B"), h(1, 34, 5, "A")]);
ok("seřazeno podle dne", r[0].den === 1 && r[1].den === 3);

// 7) Odpadlá hodina pořád říká, co tam normálně bývá — nesmí rozhodit paritu.
r = slozRozvrh([
  h(1, 34, 1, "Matematika", { zruseno: true }),
  h(1, 35, 1, "Matematika"),
]);
ok("odpadlá hodina nezpůsobí rozdělení na sudý/lichý", r.length === 1 && r[0].parita === "vzdy");

// 8) Školní akce na místě hodiny se do stálého rozvrhu nepromítne.
r = slozRozvrh([
  h(1, 34, 1, "Výlet do ZOO", { akce: true }),
  h(1, 35, 1, "Matematika"),
]);
ok("akce nepřebije skutečný předmět", r.length === 1 && r[0].predmet === "Matematika");

console.log("── změny v rozvrhu ──");

let z = zmenyZPozorovani([
  h(1, 34, 1, "Matematika"),
  h(1, 34, 5, "Tělocvik", { zruseno: true }),
  h(1, 35, 3, "Beseda", { akce: true }),
]);
ok("hlásí se jen odpadlé hodiny a akce", z.length === 2);
ok("odpadlá hodina má druh 'zruseno'", z.find((x) => x.poradi === 5)?.druh === "zruseno");
ok("akce má druh 'zmena'", z.find((x) => x.poradi === 3)?.druh === "zmena");
ok("změna nese datum, ne jen den v týdnu", z[0].den === "2025-08-18");

z = zmenyZPozorovani([h(1, 34, 1, "M"), h(2, 34, 2, "Č")]);
ok("beze změn → prázdný seznam", z.length === 0);

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

// 1. 9. 2025 je pondělí; odpadne pátá hodina, takže se končí dřív.
const zmenyDne = [
  { den: "2025-09-01", poradi: 5, druh: "zruseno" },
  { den: "2025-09-08", poradi: 1, druh: "zruseno" },
];
ok(
  "odpadlá poslední hodina posune konec vyučování",
  hodinyDneSeZmenami(rozvrh, zmenyDne, pondeli).length === 1,
);
ok(
  "změna z jiného dne se nepoužije",
  hodinyDneSeZmenami(rozvrh, zmenyDne, new Date(2025, 8, 15)).length === 2,
);

// ── Konec vyučování se počítá z časů, ne z čísel hodin ──────────────
//
// Družina, dělené hodiny a školní akce chodí z EduPage bez čísla hodiny.
// Dokud se za ně dosazovala nula, spadl celý den do jednoho slotu a
// v rozvrhu z něj zbyla jediná hodina — ranní družina. Konec vyučování
// pak vycházel na 7:50, i když se učí do 12:45.
console.log("\n── konec vyučování ──");
{
  const sDruzinou = [
    { den: 1, poradi: 0, predmet: "Družina", zacatek: "06:30:00", konec: "07:50:00", parita: "vzdy" },
    { den: 1, poradi: 1, predmet: "M", zacatek: "08:00:00", konec: "08:45:00", parita: "vzdy" },
    { den: 1, poradi: 6, predmet: "Aj", zacatek: "12:00:00", konec: "12:45:00", parita: "vzdy" },
  ];
  ok("končí poslední hodinou, ne ranní družinou", konecVyucovani(sDruzinou, pondeli) === "12:45");
  ok("začíná ranní družinou", zacatekVyucovani(sDruzinou, pondeli) === "06:30");

  // Když škola čísluje jinak, než jak jde čas, rozhoduje čas.
  const prehazene = [
    { den: 1, poradi: 9, predmet: "Ranní kroužek", zacatek: "07:00:00", konec: "07:45:00", parita: "vzdy" },
    { den: 1, poradi: 1, predmet: "M", zacatek: "08:00:00", konec: "12:45:00", parita: "vzdy" },
  ];
  ok("rozhoduje čas, ne číslo hodiny", konecVyucovani(prehazene, pondeli) === "12:45");
  ok("a začátek taky", zacatekVyucovani(prehazene, pondeli) === "07:00");
}

// ── Slot přes týdny se pozná podle času ─────────────────────────────
console.log("\n── skládání napříč týdny ──");
{
  // Týden 36 má navíc ranní družinu, týden 37 ne. Kdyby se sloty
  // párovaly podle čísla hodiny, posunula by se celému dni číslování
  // a matematika ze dvou týdnů by vyšla jako sudá a lichá hodina.
  const pozorovani = [
    { den: 1, datum: "2025-09-01", tyden: 36, poradi: 0, predmet: "Družina", zacatek: "06:30:00", konec: "07:50:00", ucebna: null, ucitel: null },
    { den: 1, datum: "2025-09-01", tyden: 36, poradi: 1, predmet: "M", zacatek: "08:00:00", konec: "08:45:00", ucebna: null, ucitel: null },
    { den: 1, datum: "2025-09-08", tyden: 37, poradi: 1, predmet: "M", zacatek: "08:00:00", konec: "08:45:00", ucebna: null, ucitel: null },
  ];
  const slozeny = slozRozvrh(pozorovani);
  const matematiky = slozeny.filter((h) => h.predmet === "M");
  ok("matematika je jedna hodina, ne dvě", matematiky.length === 1);
  ok("a platí každý týden", matematiky[0]?.parita === "vzdy");
  ok("družina se neztratí", slozeny.some((h) => h.predmet === "Družina"));
}

// ── Pořadí v rámci dne a parity musí být jedinečné ──────────────────
//
// Databáze má na (dítě, den, pořadí, parita) jedinečnost. Dva sloty se
// stejným číslem by shodily zápis celého rozvrhu, ne jen jeden řádek.
console.log("\n── jedinečné pořadí ──");
{
  const kolize = [
    { den: 1, datum: "2025-09-01", tyden: 36, poradi: 0, predmet: "Družina", zacatek: "06:30:00", konec: "07:50:00", ucebna: null, ucitel: null },
    { den: 1, datum: "2025-09-01", tyden: 36, poradi: 0, predmet: "M", zacatek: "08:00:00", konec: "08:45:00", ucebna: null, ucitel: null },
    { den: 1, datum: "2025-09-01", tyden: 36, poradi: 0, predmet: "Aj", zacatek: "12:00:00", konec: "12:45:00", ucebna: null, ucitel: null },
  ];
  const slozeny = slozRozvrh(kolize);
  ok("žádná hodina se neztratí", slozeny.length === 3);
  const klice = slozeny.map((h) => `${h.den}|${h.poradi}|${h.parita}`);
  ok("a žádné dvě nesdílí místo v databázi", new Set(klice).size === 3);
  ok("dřívější hodina má nižší pořadí", slozeny[0].predmet === "Družina");
}


console.log(selhalo === 0 ? "\n=== VŠE PROŠLO ===" : `\n=== ${selhalo} SELHALO ===`);
process.exit(selhalo === 0 ? 0 : 1);
