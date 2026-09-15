/**
 * Období souhrnu pro soud.
 *
 * Tenhle soubor vznikl kvůli výpadku: pomocná funkce bydlela
 * v komponentě označené `"use client"` a serverová stránka ji volala.
 * Sestavení prošlo, typová kontrola prošla, a `/souhrn` v ostrém
 * provozu padal na 500. Test nechytí to, kde funkce bydlí — ale
 * zaručuje, že je v `lib`, kde ji server volat smí, protože odjinud
 * by nešla ani načíst.
 *
 * Spouští se přes `npm run test:obdobi`.
 */
const { urciObdobi, PREDVOLBY } = require("../.test-build/obdobi.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}
const klic = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

console.log("── výchozí období ──");
{
  const o = urciObdobi(undefined, undefined);
  ok("bez parametrů posledních 12 měsíců", o.klic === "minulych-12");
  ok("začátek je před koncem", o.od <= o.do);
}

console.log("── vlastní rozsah z adresy ──");
{
  // Schválně rozsah, který na žádnou předvolbu nepadne — celý rok
  // 2025 je totiž zrovna teď předvolba „Loni" a test by tvrdil,
  // že se předvolba nepoznala, i když se poznala správně.
  const o = urciObdobi("2025-03-07", "2025-06-18");
  ok("datumy se přeberou", klic(o.od) === "2025-03-07" && klic(o.do) === "2025-06-18");
  ok("označí se jako vlastní", o.klic === "vlastni");
}

console.log("── loňský rok se pozná jako předvolba ──");
{
  const r = PREDVOLBY.loni.rozsah();
  const o = urciObdobi(klic(r.od), klic(r.do));
  ok("celý loňský rok je předvolba, ne vlastní", o.klic === "loni");
}

console.log("── rozsah, který sedí na předvolbu ──");
{
  const r = PREDVOLBY["tento-mesic"].rozsah();
  const o = urciObdobi(klic(r.od), klic(r.do));
  // Bez tohohle by se po kliknutí na „Tento měsíc" tlačítko nezvýraznilo.
  ok("pozná se předvolba", o.klic === "tento-mesic");
}

console.log("── nesmysl v adrese stránku neshodí ──");
for (const [popis, od, doData] of [
  ["prohozené pořadí", "2025-12-31", "2025-01-01"],
  ["nesmyslný text", "včera", "dnes"],
  ["chybějící konec", "2025-01-01", undefined],
  ["prázdné hodnoty", "", ""],
  ["neexistující datum", "2025-02-30", "2025-03-01"],
]) {
  const o = urciObdobi(od, doData);
  ok(`${popis} → výchozí období`, o.klic === "minulych-12" && o.od <= o.do);
}

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
