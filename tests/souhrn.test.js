/**
 * Souhrn péče a nákladů — čísla, o která se někdo opře před soudem.
 *
 * Tady nejde o rozvržení stránky, ale o to, že sedí částky a počty.
 * Špatně spočítané vyrovnání v dokumentu, který jde advokátovi, je
 * horší než žádný dokument: vypadá stejně věrohodně jako správné.
 *
 * Spouští se přes `npm run test:souhrn`.
 */
const {
  vydajePodleKategorii,
  vydajePodleRodice,
  nevyrovnano,
  dopravaPodleRodice,
  nociZaObdobi,
} = require("../.test-build/souhrn.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const MAMA = { id: "m1", userId: "u1", name: "Kateřina", role: "owner", side: "a", email: null, color: "#f0f", avatarUrl: null };
const TATA = { id: "m2", userId: "u2", name: "Lukáš", role: "parent", side: "b", email: null, color: "#0ff", avatarUrl: null };
const BABI = { id: "m3", userId: "u3", name: "Babička", role: "guardian", side: null, email: null, color: "#ff0", avatarUrl: null };
const CLENOVE = [MAMA, TATA, BABI];

function vydaj(o) {
  return {
    id: Math.random().toString(36),
    family_id: "f", child_id: null, category: "school", title: "x",
    amount: 100, currency: "CZK", spent_on: "2026-03-01", paid_by: MAMA.id,
    split_percent: 50, settled: false, activity_id: null, event_id: null,
    note: null, created_at: "2026-03-01",
    ...o,
  };
}

console.log("── výdaje podle kategorií ──");
{
  const k = vydajePodleKategorii([
    vydaj({ category: "school", amount: 1000 }),
    vydaj({ category: "school", amount: 500 }),
    vydaj({ category: "activities", amount: 2400 }),
  ]);
  ok("řadí se od nejdražší", k[0].kategorie === "activities");
  ok("sčítá stejnou kategorii", k[1].castka === 1500);
  ok("počítá i položky", k[1].pocet === 2);
  ok("má český název", k[0].nazev === "Kroužky");
  ok("prázdný vstup dá prázdný výstup", vydajePodleKategorii([]).length === 0);
}

console.log("── kdo kolik zaplatil ──");
{
  const r = vydajePodleRodice(
    [
      vydaj({ paid_by: MAMA.id, amount: 3000 }),
      vydaj({ paid_by: TATA.id, amount: 1000 }),
      vydaj({ paid_by: null, amount: 500 }),
    ],
    CLENOVE,
  );
  ok("nejvíc platící první", r[0].jmeno === "Kateřina" && r[0].zaplatil === 3000);
  ok("výdaj bez plátce nezmizí", r.some((x) => x.jmeno === "nezapsáno" && x.zaplatil === 500));
}

console.log("── kolik zbývá dorovnat ──");
{
  // Máma zaplatila 1000, táta nese polovinu → dluží 500.
  const v = nevyrovnano([vydaj({ paid_by: MAMA.id, amount: 1000, split_percent: 50 })], CLENOVE);
  ok("dluží se tomu, kdo platil", v?.jmeno === "Kateřina");
  ok("polovina z tisíce", v?.castka === 500);
}
{
  const v = nevyrovnano(
    [
      vydaj({ paid_by: MAMA.id, amount: 1000, split_percent: 50 }),
      vydaj({ paid_by: TATA.id, amount: 1000, split_percent: 50 }),
    ],
    CLENOVE,
  );
  ok("stejné výdaje z obou stran se vyruší", v === null);
}
{
  // Vypořádané výdaje se už jednou srovnaly. Započítat je znovu by
  // vyrobilo dluh, který neexistuje.
  const v = nevyrovnano(
    [vydaj({ paid_by: MAMA.id, amount: 1000, settled: true })],
    CLENOVE,
  );
  ok("vypořádaný výdaj se nepočítá", v === null);
}
{
  const v = nevyrovnano([vydaj({ paid_by: MAMA.id, amount: 1000, split_percent: 0 })], CLENOVE);
  ok("nulový podíl znamená nic k dorovnání", v === null);
}
{
  // Babička je pečující osoba, ne rodič — dorovnává se mezi rodiči.
  const v = nevyrovnano([vydaj({ paid_by: MAMA.id, amount: 1000 })], [MAMA, TATA, BABI]);
  ok("pečující osoba do vyrovnání nevstupuje", v?.jmeno === "Kateřina");
}
{
  const v = nevyrovnano([vydaj({ paid_by: MAMA.id, amount: 1000 })], [MAMA]);
  ok("u jednoho rodiče se nedorovnává", v === null);
}

console.log("── kdo vozí ──");
{
  const jizda = (o) => ({
    key: "k", day: "2026-03-02", activity: {}, startsAt: "16:00", endsAt: "17:00",
    cancelled: false, driverThere: MAMA.id, driverBack: TATA.id, note: null,
    occurrenceId: null, ...o,
  });
  const d = dopravaPodleRodice(
    [
      jizda({}),
      jizda({ driverThere: MAMA.id, driverBack: MAMA.id }),
      jizda({ cancelled: true, driverThere: TATA.id, driverBack: TATA.id }),
      jizda({ driverThere: null, driverBack: null }),
    ],
    CLENOVE,
  );
  ok("tam a zpět jsou dvě jízdy", d.rodice.find((r) => r.jmeno === "Kateřina").celkem === 3);
  ok("zrušený termín se nepočítá", d.rodice.find((r) => r.jmeno === "Lukáš").celkem === 1);
  // Kdyby se nezapsané jízdy tiše zahodily, vypadal by dokument
  // úplnější, než jaký doopravdy je.
  ok("nezapsaný řidič je vidět", d.bezRidice === 2);
  ok("celkem sedí i s nezapsanými", d.celkem === 6);
}

console.log("── noci ──");
{
  // Střídání po týdnu od pondělí, celý březen 2026.
  const vzor = {
    id: "p", family_id: "f", child_id: null, kind: "alternating_weeks",
    starts_on: "2026-03-01", ends_on: null, anchor_date: "2026-03-02",
    anchor_side: "a", weekly_map: null, fixed_side: null,
    handover_dow: 1, handover_time: "18:00", note: null,
  };
  const n = nociZaObdobi({
    od: new Date("2026-03-02T00:00:00"),
    do: new Date("2026-03-29T00:00:00"),
    patterns: [vzor],
    overrides: [],
    childId: null,
  });
  ok("čtyři týdny mají 28 nocí", n.celkem === 28);
  ok("střídání po týdnu dělí napůl", n.a === 14 && n.b === 14);
  ok("podíly dávají sto procent", n.procentA + n.procentB === 100);
  ok("nic nezůstalo nepřiřazené", n.neprirazeno === 0);
}

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
