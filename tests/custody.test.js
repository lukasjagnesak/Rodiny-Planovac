/**
 * Dny a noci v kalendáři.
 *
 * Noc patří tomu, u koho dítě usíná. Uvnitř pobytu je to táž strana jako
 * přes den, na dni předání záleží na tom, kdy se předává: odpoledne
 * znamená, že dítě spí už u přebírajícího, ráno následujícího dne že
 * ještě u odcházejícího. Tentýž rozpis dnů proto může být jiný počet
 * nocí — a je to číslo, ze kterého se odvíjí i výživné.
 *
 * Testuje se přes `resolveCustody`, ne přes ručně poskládaná pole:
 * pravidlo pro noc bydlí tam a duplikovat ho v testu by nic neověřilo.
 *
 * Spouští se přes `npm run test:custody`.
 */
const { resolveCustody, custodyStats, custodyStatsForRange } = require("../.test-build/custody.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

/** Vzor „vlastní rozpis dnů“ — sedm znaků od pondělí. */
const vzor = (weekly_map, zmeny = {}) => ({
  id: "p1",
  family_id: "f1",
  child_id: null,
  kind: "custom_weekly",
  starts_on: "2020-01-01",
  ends_on: null,
  anchor_date: "2026-01-05",
  anchor_side: "a",
  weekly_map,
  fixed_side: null,
  handover_dow: 1,
  handover_time: "18:00",
  predavka_vecer: true,
  note: null,
  ...zmeny,
});

/** Pondělí 7. 9. 2026 a dál. */
function tyden(pocet = 7, od = "2026-09-07") {
  const start = new Date(`${od}T12:00:00Z`);
  return Array.from({ length: pocet }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d;
  });
}

const rozvrhni = (weekly_map, { dnu = 7, vzorZmeny = {}, overrides = [] } = {}) =>
  resolveCustody({
    days: tyden(dnu),
    patterns: [vzor(weekly_map, vzorZmeny)],
    overrides,
    childId: null,
  });

console.log("── uvnitř pobytu ──");
{
  const dny = rozvrhni("aaaaaaa");
  ok("celý týden u jednoho rodiče", dny.every((d) => d.side === "a"));
  ok("noc patří témuž rodiči", dny.every((d) => d.nightSide === "a"));
  ok("žádný den se nepůlí", dny.every((d) => !d.isNightSplit));
}

console.log("── předávka přes den (výchozí) ──");
{
  // Čtvrtek a pátek u A, zbytek u B.
  const dny = rozvrhni("bbbaabb");
  const s = custodyStats(dny);
  ok("dva zaškrtnuté dny u A", s.daysA === 2);
  // Předává se přes den, takže dítě přijíždí už ve středu večer a ve
  // čtvrtek u A spí. Odjíždí v pátek přes den, pátek už spí u B.
  ok("středa se kreslí přepůlená (příjezd)", dny[2].isNightSplit && dny[2].nightSide === "a");
  ok("pátek se kreslí přepůlený (odjezd)", dny[4].isNightSplit && dny[4].nightSide === "b");
  ok("čtvrtek uprostřed pobytu se nepůlí", !dny[3].isNightSplit);
  ok("co se u jedné předávky získá, u druhé ztratí", s.nightsA === s.daysA);
  ok("nikdy víc nocí než dnů", s.nightsA <= s.daysA && s.nightsB <= s.daysB);
  ok("každý den má právě jednu noc", s.nightsA + s.nightsB === s.daysA + s.daysB);
}

console.log("── krátký pobyt: dva dny, jedna noc ──");
{
  // Dítě přijíždí až ve čtvrtek odpoledne a v pátek odpoledne odjíždí.
  // Vzor to sám neuhodne — středeční noc se přepíše ručně na B.
  const dny = rozvrhni("bbbaabb", {
    overrides: [
      {
        id: "o1",
        family_id: "f1",
        child_id: null,
        day: "2026-09-09",
        side: null,
        nocni_strana: "b",
        reason: "přijíždí až ve čtvrtek",
      },
    ],
  });
  const s = custodyStats(dny);
  ok("pořád dva zaškrtnuté dny", s.daysA === 2);
  ok("ale jen jedna noc", s.nightsA === 1);
  ok("součet nocí zůstal celý", s.nightsA + s.nightsB === s.total);
}

console.log("── předávka až ráno ──");
{
  const dny = rozvrhni("bbbaabb", { vzorZmeny: { predavka_vecer: false } });
  const s = custodyStats(dny);
  ok("dva dny jsou dvě noci", s.daysA === 2 && s.nightsA === 2);
  ok("nic se nepůlí", dny.every((d) => !d.isNightSplit));
}

console.log("── ruční výjimka na den ──");
{
  // Vzor říká, že v pátek dítě spí u B. Přepíšeme to na A.
  const dny = rozvrhni("bbbaabb", {
    overrides: [
      {
        id: "o1",
        family_id: "f1",
        child_id: null,
        day: "2026-09-11",
        side: null,
        nocni_strana: "a",
        reason: null,
      },
    ],
  });
  const s = custodyStats(dny);
  ok("výjimka přebije pravidlo ze vzoru", dny[4].nightSide === "a");
  ok("a promítne se do součtu", s.nightsA === 3);
  ok("výjimka jen na noc nechá den beze změny", dny[4].side === "a");
}

console.log("── střídání po týdnu ──");
{
  const s = custodyStats(rozvrhni("aaaaaaa", { dnu: 14 }));
  ok("dva celé týdny u jednoho", s.daysA === 14 && s.nightsA === 14);
}

console.log("── celky a krajní případy ──");
{
  const s = custodyStats(rozvrhni("bbbaabb"));
  ok("procenta se dopočítávají do sta", s.percentA + s.percentB === 100);
  ok("prázdný měsíc nespadne", custodyStats([]).nightsTotal === 0);
}
{
  const jeden = custodyStats(rozvrhni("aaaaaaa", { dnu: 1 }));
  ok("jediný den je jedna noc", jeden.daysA === 1 && jeden.nightsA === 1);
}

console.log("── měsíční součet, když předání padne přesně na poslední den ──");
{
  // Středa (idx 2) = a, čtvrtek (idx 3) = b: 30. 9. 2026 je středa,
  // 1. 10. čtvrtek — hranice měsíce padá přímo na předání.
  const pattern = vzor("aaabbbb");
  const zari = { start: new Date("2026-09-01T12:00:00Z"), end: new Date("2026-09-30T12:00:00Z") };

  // Naivní výpočet bez dne navíc — takhle to dřív dělal dashboard a
  // dostával špatné číslo, protože poslední noc neměl s čím porovnat.
  const naivneDny = [];
  for (let d = new Date(zari.start); d <= zari.end; d.setUTCDate(d.getUTCDate() + 1)) {
    naivneDny.push(new Date(d));
  }
  const naivne = custodyStats(
    resolveCustody({ days: naivneDny, patterns: [pattern], overrides: [], childId: null }),
  );

  const spravne = custodyStatsForRange({
    start: zari.start,
    end: zari.end,
    patterns: [pattern],
    overrides: [],
    childId: null,
  });

  ok("naivní výpočet dá 30. září straně A (a je to špatně)", naivne.nightsA === 14);
  ok("custodyStatsForRange přisoudí noc 30. 9. správně straně B", spravne.nightsA === 13);
  ok("a nikde se neztratí ani nepřidá noc navíc", spravne.nightsTotal === 30);
}

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\nSelhalo: ${selhalo}`);
process.exit(selhalo === 0 ? 0 : 1);
