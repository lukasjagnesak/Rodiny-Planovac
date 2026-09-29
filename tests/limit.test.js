/**
 * Omezení počtu volání na veřejných koncových bodech.
 *
 * Limit má dvě rovnocenné povinnosti a obě se snadno pokazí: nepustit
 * dál toho, kdo bije na dveře, a nezavřít je před nikým jiným. Když se
 * klíč nečte správně z hlaviček za proxy, sdílí ho všichni návštěvníci
 * a druhá povinnost padne — web se zavře celému internetu najednou.
 *
 * Spouští se přes `npm run test:limit`.
 */
const { Limit, klicVolajiciho, MINUTA, HODINA } = require("../.test-build/limit.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

console.log("── počítání v okně ──");
{
  const l = new Limit(3, MINUTA);
  ok("první projde", l.prekrocen("a") === false);
  ok("druhé projde", l.prekrocen("a") === false);
  ok("třetí projde", l.prekrocen("a") === false);
  ok("čtvrté už ne", l.prekrocen("a") === true);
  ok("a další taky ne", l.prekrocen("a") === true);
}

console.log("── klíče se nepletou ──");
{
  const l = new Limit(1, MINUTA);
  l.prekrocen("a");
  ok("vyčerpaný klíč je zavřený", l.prekrocen("a") === true);
  ok("cizí klíč tím netrpí", l.prekrocen("b") === false);
}

console.log("── okno vyprší ──");
{
  const skutecne = Date.now;
  try {
    let ted = 1_000_000;
    Date.now = () => ted;
    const l = new Limit(2, MINUTA);
    l.prekrocen("a");
    l.prekrocen("a");
    ok("třetí v okně neprojde", l.prekrocen("a") === true);
    ted += MINUTA + 1;
    ok("po vypršení se zase smí", l.prekrocen("a") === false);
  } finally {
    Date.now = skutecne;
  }
}

console.log("── mrtvé klíče se uklidí ──");
{
  // Bez úklidu mapa roste, dokud se aplikace nerestartuje. U měření,
  // kam chodí každý návštěvník, by to za týden byly statisíce záznamů.
  const skutecne = Date.now;
  try {
    let ted = 1_000_000;
    Date.now = () => ted;
    const l = new Limit(5, MINUTA);
    for (let i = 0; i < 200; i++) l.prekrocen(`navstevnik-${i}`);
    ok("všech dvě stě se sleduje", l.velikost === 200);
    ted += MINUTA + 1;
    l.prekrocen("někdo-nový");
    ok("po vypršení okna zbude jen ten nový", l.velikost === 1);
  } finally {
    Date.now = skutecne;
  }
}

console.log("── klíč z hlaviček za proxy ──");
{
  const h = (o) => new Headers(o);
  ok(
    "bere se první adresa z x-forwarded-for, ne poslední",
    klicVolajiciho(h({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" })) === "203.0.113.9",
  );
  ok("mezery se ořežou", klicVolajiciho(h({ "x-forwarded-for": "  203.0.113.9  " })) === "203.0.113.9");
  ok(
    "bez forwarded se sáhne po x-real-ip",
    klicVolajiciho(h({ "x-real-ip": "198.51.100.4" })) === "198.51.100.4",
  );
  ok(
    "forwarded má přednost před real-ip",
    klicVolajiciho(h({ "x-forwarded-for": "203.0.113.9", "x-real-ip": "10.0.0.1" })) === "203.0.113.9",
  );
  ok("bez hlaviček se nevrací prázdný řetězec, ale null", klicVolajiciho(h({})) === null);
  ok(
    "prázdná hlavička se chová jako chybějící",
    klicVolajiciho(h({ "x-forwarded-for": "" })) === null,
  );
}

console.log("── hodina je hodina ──");
ok("HODINA je šedesát minut", HODINA === 60 * MINUTA);

console.log(selhalo === 0 ? "\nVšechno sedí." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
