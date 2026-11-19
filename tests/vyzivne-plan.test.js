/**
 * Překlad z kalkulačky výživného do aplikace.
 *
 * Dvě věci se tu dají splést tak, že si toho nikdo nevšimne, dokud se
 * někomu nerozsype kalendář nebo vyrovnání:
 *
 *   1. strana rodiče — podíl péče je „kolik má rodič A", ale
 *      `fixed_parent` chce „u koho dítě je";
 *   2. dělení výživného — není to společný výdaj k rozpočítání, ale
 *      převod. Se stoprocentním podílem by vyrovnání tvrdilo, že
 *      příjemce plátci dluží přesně tu částku, kterou dostal.
 *
 * Spouští se přes `npm run test:vyzivne-plan`.
 */
const {
  rozvrhZPece,
  maCastku,
  VYZIVNE_NEDELI_SE,
  VYZIVNE_TITULEK,
  ROVNOMERNE,
  TEMER_VYHRADNE,
} = require("../.test-build/lib/vyzivne-plan.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

console.log("── rovnoměrná péče ──");
ok("přesná polovina je týden po týdnu", rozvrhZPece(50)?.kind === "iso_week_parity");
ok("i 45 % ještě", rozvrhZPece(ROVNOMERNE.od)?.kind === "iso_week_parity");
ok("i 55 % ještě", rozvrhZPece(ROVNOMERNE.do)?.kind === "iso_week_parity");

console.log("── téměř výhradní péče ──");
const skoroA = rozvrhZPece(90);
ok("dítě u rodiče A", skoroA?.kind === "fixed_parent" && skoroA.anchorSide === "a");
const skoroB = rozvrhZPece(10);
ok("dítě u rodiče B", skoroB?.kind === "fixed_parent" && skoroB.anchorSide === "b");
ok("strana se neprohodila", rozvrhZPece(TEMER_VYHRADNE)?.anchorSide === "a");
ok("ani na druhém konci", rozvrhZPece(100 - TEMER_VYHRADNE)?.anchorSide === "b");
ok("krajní hodnoty projdou", rozvrhZPece(0)?.anchorSide === "b" && rozvrhZPece(100)?.anchorSide === "a");

console.log("── co se odvodit nedá ──");
ok("60 / 40 se nepředvyplňuje", rozvrhZPece(60) === null);
ok("ani 40 / 60", rozvrhZPece(40) === null);
ok("ani 70 / 30", rozvrhZPece(70) === null);
ok("nesmysl na vstupu nespadne", rozvrhZPece(Number.NaN) === null);

console.log("── výživné není společný výdaj ──");
ok("podíl druhého rodiče je nula", VYZIVNE_NEDELI_SE === 0);
ok("titulek je bez jmen", VYZIVNE_TITULEK === "Výživné" && !/rodič/i.test(VYZIVNE_TITULEK));

// Kdyby se podíl někdy přepsal na sto, vyrovnání by z přijatého
// výživného udělalo dluh příjemce. Tohle je ten výpočet ze `souhrn.ts`.
const podil = (2420 * VYZIVNE_NEDELI_SE) / 100;
ok("vyrovnání se z výživného nehne", podil === 0);

console.log("── kdy se položka vůbec zakládá ──");
ok(
  "se stanoveným výživným ano",
  maCastku({ etapy: ["druhy-stupen"], peceA: 50, plati: "a", castka: 2420 }),
);
ok(
  "bez plátce ne",
  !maCastku({ etapy: ["druhy-stupen"], peceA: 50, plati: null, castka: 0 }),
);
ok(
  "s nulovou částkou ne",
  !maCastku({ etapy: ["druhy-stupen"], peceA: 50, plati: "a", castka: 0 }),
);

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
