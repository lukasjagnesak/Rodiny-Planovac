/**
 * Partnerský program — počítání cizích peněz.
 *
 * Jediné místo v aplikaci, kde se počítá odměna někomu mimo rodinu.
 * Provize spočítaná o dvě stě korun jinak, než co partner čeká, není
 * kosmetická chyba — je to spor s člověkem, který posílá klienty.
 *
 * Spouští se přes `npm run test:partneri`.
 */
const {
  slozPrehled,
  navrhKodu,
  PROVIZE_PROCENTO,
  MINIMALNI_VYPLATA_KC,
  platbyKProvizi,
} = require("../.test-build/partneri.js");
const { refJeStalePlatny } = require("../.test-build/atribuce.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

console.log("── počty rodin podle stavu ──");
{
  const p = slozPrehled({
    stavy: ["zkusebni", "aktivni", "aktivni", "zruseno", "po_splatnosti"],
    zaplaceno: [],
  });
  ok("celkem", p.rodinCelkem === 5);
  ok("ve zkušebním", p.veZkusebnim === 1);
  // Rodina po splatnosti pořád platí — Stripe to jen ještě zkouší.
  // Vyřadit ji z platících by partnerovi ubralo provizi za peníze,
  // které dostaneme.
  ok("platící včetně po splatnosti", p.platicich === 3);
  ok("zrušené", p.zrusenych === 1);
}

console.log("── provize ──");
{
  const p = slozPrehled({ stavy: ["aktivni"], zaplaceno: [1990, 1990] });
  ok("základ je součet plateb", p.zaklad === 3980);
  ok("čtvrtina z toho", p.provize === 995);
}
{
  // Zaokrouhluje se dolů. Vyplatit se má to, co je jisté.
  const p = slozPrehled({ stavy: [], zaplaceno: [199] });
  ok("desetiny se nevyplácejí", p.provize === 49);
}
{
  const p = slozPrehled({ stavy: [], zaplaceno: [1990], provizeProcento: 40 });
  ok("individuální sazba se respektuje", p.provize === 796);
}
{
  const p = slozPrehled({ stavy: [], zaplaceno: [] });
  ok("bez plateb je nula, ne NaN", p.zaklad === 0 && p.provize === 0);
  ok("do výplaty chybí celé minimum", p.doVyplaty === MINIMALNI_VYPLATA_KC);
}
{
  const p = slozPrehled({ stavy: [], zaplaceno: [8000] });
  ok("nad minimem se nechybí nic", p.doVyplaty === 0);
  ok("výchozí sazba je ta z ceníku", p.provize === (8000 * PROVIZE_PROCENTO) / 100);
}

console.log("── platnost doporučení ──");
{
  const KLIK = "2026-06-01T10:00:00.000Z";
  const za = (dni) => new Date(new Date(KLIK).getTime() + dni * 24 * 60 * 60 * 1000);
  ok("hned po kliknutí platí", refJeStalePlatny(KLIK, za(0), 90) === true);
  ok("den před koncem platí", refJeStalePlatny(KLIK, za(89), 90) === true);
  ok("po devadesáti dnech ne", refJeStalePlatny(KLIK, za(91), 90) === false);
  ok("čas pozpátku neplatí", refJeStalePlatny(KLIK, za(-1), 90) === false);
  ok("nesmysl místa data neplatí", refJeStalePlatny("včera", new Date(), 90) === false);
}

console.log("── návrh kódu do odkazu ──");
ok("diakritika pryč", navrhKodu("Jana Nováková") === "jana-novakova");
ok("mezery a interpunkce na pomlčky", navrhKodu("Mgr. Petr Černý, LL.M.") === "mgr-petr-cerny-ll-m");
ok("pomlčky na krajích se ořežou", navrhKodu("  Eva  ") === "eva");
ok("prázdné jméno nespadne", navrhKodu("") === "");

console.log("── provize z prvních 12 měsíců placení ──");
{
  const vznik = new Map([["f1", new Date("2026-01-01").getTime()]]);
  const p = (datum, castka = 129) => ({ family_id: "f1", castka, zaplaceno_at: `${datum}T10:00:00Z` });
  // Rok zdarma, pak měsíční platby od ledna 2027.
  const platby = [
    p("2025-12-15", 999), // před doporučením — nepočítá se
    ...Array.from({ length: 14 }, (_, i) => p(`20${27 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}-05`)),
  ];
  const zaklad = platbyKProvizi(platby, vznik);
  ok("počítá se 12 plateb, ne 14", zaklad.length === 12);
  ok("platba před doporučením ne", !zaklad.includes(999));
  ok("rok zdarma provizi nesežere", zaklad.reduce((a, b) => a + b, 0) === 12 * 129);
}

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
