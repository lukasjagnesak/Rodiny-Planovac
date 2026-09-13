/**
 * Články: plánované vydávání a označení příběhů.
 *
 * Dvě věci, které se nesmí rozbít potichu. Text s datem v budoucnu se
 * nesmí objevit dřív — jinak by na webu visel vánoční článek v září
 * a v mapě webu by byla adresa, která vrací 404. A modelový příběh se
 * nesmí tvářit jako záznam skutečného rozhovoru.
 *
 * Spouští se přes `npm run test:clanky`.
 */
const { VSECHNY, vydane, najdi, jeVydany } = require("../.test-build/lib/clanky.js");
const { dobaCteni, rozlozTucne } = require("../.test-build/lib/clanky-typy.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

console.log("── plánované vydávání ──");
const PRED = new Date("2026-09-01T12:00:00Z");
const PO = new Date("2027-01-01T12:00:00Z");

ok("na začátku září ještě nic nevyšlo", vydane(PRED).length === 0);
ok("do konce roku vyjde všechno", vydane(PO).length === VSECHNY.length);
ok(
  "text s datem v budoucnu se nedá otevřít",
  najdi("vanoce-ve-stridave-peci", PRED) === null,
);
ok(
  "po vydání ano",
  najdi("vanoce-ve-stridave-peci", PO)?.slug === "vanoce-ve-stridave-peci",
);
ok("neznámá adresa vrací null", najdi("neexistuje", PO) === null);

// Hranice dne, ne hodiny: článek vydaný „dnes" má být vidět celý den.
const vanoce = VSECHNY.find((c) => c.slug === "vanoce-ve-stridave-peci");
ok(
  "v den vydání je text venku už ráno",
  jeVydany(vanoce, new Date(`${vanoce.datum}T06:00:00Z`)) === true,
);
ok(
  "den předtím ještě ne",
  jeVydany(vanoce, new Date("2026-11-03T23:00:00Z")) === false,
);

console.log("── řazení ──");
const serazene = vydane(PO);
ok(
  "od nejnovějšího",
  serazene.every((c, i) => i === 0 || serazene[i - 1].datum >= c.datum),
);

console.log("── celistvost ──");
ok("každý slug je jedinečný", new Set(VSECHNY.map((c) => c.slug)).size === VSECHNY.length);
ok("každý text má perex", VSECHNY.every((c) => c.perex.length > 20));
ok("každý text má tělo", VSECHNY.every((c) => c.bloky.length >= 3));
ok(
  "datum je ve tvaru RRRR-MM-DD",
  VSECHNY.every((c) => /^\d{4}-\d{2}-\d{2}$/.test(c.datum)),
);
ok("žádný text není prázdný", VSECHNY.every((c) => dobaCteni(c) >= 1));

console.log("── modelové příběhy ──");
const pribehy = VSECHNY.filter((c) => c.druh === "pribeh");
ok("nějaké existují", pribehy.length > 0);
// Označení vykresluje komponenta podle `druh`. Tenhle test hlídá to, co
// se v datech zkazit dá: že se příběh omylem uloží jako článek.
ok(
  "příběh se pozná z perexu i bez komponenty",
  pribehy.every((c) => /modelov/i.test(c.perex)),
);
ok(
  "články se za příběhy nevydávají",
  VSECHNY.filter((c) => c.druh === "clanek").every((c) => !/modelov/i.test(c.perex)),
);

console.log("── tučný text ──");
ok(
  "rozloží se na kusy",
  JSON.stringify(rozlozTucne("ne **ano** ne")) ===
    JSON.stringify([
      { text: "ne ", tucne: false },
      { text: "ano", tucne: true },
      { text: " ne", tucne: false },
    ]),
);
ok(
  "text bez hvězdiček zůstane jedním kusem",
  rozlozTucne("obyčejná věta").length === 1,
);

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
