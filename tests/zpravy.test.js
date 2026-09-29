/**
 * Komunikace mezi rodiči.
 *
 * Výpis posílá rodič advokátovi. Chybějící zpráva nebo špatné datum je
 * horší než kdyby výpis neexistoval — proti takovému dokumentu se druhá
 * strana ohradí a bude mít pravdu.
 *
 * Spouští se přes `npm run test:zpravy`.
 */
const {
  poDnech,
  pocetNeprectenych,
  prectenaDruhym,
  vypisKomunikace,
} = require("../.test-build/zpravy.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const z = (id, autor, text, cas, extra = {}) => ({
  id,
  autor,
  autor_jmeno: autor === "a" ? "Táta" : "Máma",
  text,
  den: null,
  child_id: null,
  expense_id: null,
  event_id: null,
  created_at: cas,
  precteni: [],
  ...extra,
});

console.log("── řazení a seskupení ──");
{
  const dny = poDnech([
    z("3", "b", "třetí", "2026-04-11T08:00:00Z"),
    z("1", "a", "první", "2026-04-10T09:00:00Z"),
    z("2", "b", "druhá", "2026-04-10T18:00:00Z"),
  ]);
  ok("dva dny", dny.length === 2);
  ok("od nejstaršího dne", dny[0].den === "2026-04-10");
  ok("v rámci dne chronologicky", dny[0].zpravy.map((x) => x.id).join() === "1,2");
}

console.log("── nepřečtené ──");
{
  const zpravy = [
    z("1", "b", "od druhého rodiče", "2026-04-10T09:00:00Z"),
    z("2", "b", "taky od něj", "2026-04-10T10:00:00Z", {
      precteni: [{ user_id: "a", precteno_at: "2026-04-10T11:00:00Z" }],
    }),
    z("3", "a", "moje vlastní", "2026-04-10T12:00:00Z"),
  ];
  ok("počítá jen cizí a nepřečtené", pocetNeprectenych(zpravy, "a") === 1);
  ok("vlastní zprávy se nepočítají", pocetNeprectenych([zpravy[2]], "a") === 0);
  ok("druhé straně to sedí taky", pocetNeprectenych(zpravy, "b") === 1);
}

console.log("── razítko přečtení ──");
{
  const nikdo = z("1", "a", "ahoj", "2026-04-10T09:00:00Z");
  ok("bez přečtení vrací null", prectenaDruhym(nikdo) === null);

  const jenAutor = z("2", "a", "ahoj", "2026-04-10T09:00:00Z", {
    precteni: [{ user_id: "a", precteno_at: "2026-04-10T09:00:01Z" }],
  });
  ok("autorovo vlastní otevření se nepočítá", prectenaDruhym(jenAutor) === null);

  const druhy = z("3", "a", "ahoj", "2026-04-10T09:00:00Z", {
    precteni: [
      { user_id: "b", precteno_at: "2026-04-11T07:00:00Z" },
      { user_id: "c", precteno_at: "2026-04-10T20:00:00Z" },
    ],
  });
  ok("bere první pohled, ne poslední", prectenaDruhym(druhy) === "2026-04-10T20:00:00Z");
}

console.log("── výpis pro advokáta ──");
{
  const zpravy = [
    z("1", "a", "V pátek to bude o hodinu později.", "2026-04-10T09:30:00Z", {
      den: "2026-04-12",
      precteni: [{ user_id: "b", precteno_at: "2026-04-10T10:15:00Z" }],
    }),
    z("2", "b", "Beru na vědomí.", "2026-04-10T10:20:00Z", { expense_id: "v1" }),
  ];
  const odstavce = vypisKomunikace(zpravy, "Novákovi", {
    deti: {},
    vydaje: { v1: "Lyžák Kuba" },
    udalosti: {},
  });
  const cely = odstavce.map((o) => o.text).join("\n");

  ok("má nadpis s rodinou", odstavce[0].text.includes("Novákovi"));
  ok("uvádí počet zpráv", cely.includes("2 zpráv"));
  ok("říká, že se zprávy nedají upravit", cely.includes("nelze v aplikaci upravit"));
  ok("obsahuje obě zprávy doslova", cely.includes("o hodinu později") && cely.includes("Beru na vědomí"));
  ok("podepisuje autory", cely.includes("Táta") && cely.includes("Máma"));
  ok("ukazuje kontext výdaje", cely.includes("Lyžák Kuba"));
  ok("u přečtené uvádí kdy", cely.includes("přečteno"));
  ok("u nepřečtené to přizná", cely.includes("zatím nepřečteno"));
  ok("den, ke kterému se zpráva vztahuje", cely.includes("12. dubna"));
}
{
  const prazdny = vypisKomunikace([], "Novákovi");
  ok("prázdné období nespadne", prazdny.length === 2);
  ok("a řekne, že nic není", prazdny[1].text.includes("žádná zpráva"));
}

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\nSelhalo: ${selhalo}`);
process.exit(selhalo === 0 ? 0 : 1);
