/**
 * Termíny opakovaných výdajů.
 *
 * Datumová matematika je tiše zrádná: chyba se nepozná při ukládání,
 * ale až tím, že někomu chybí výživné za únor nebo mu přišlo dvakrát.
 *
 * Spouští se přes `npm run test:opakovani`.
 */
const {
  chybejiciTerminy,
  pristiTermin,
  termin,
  MAX_TERMINU_ZA_BEH,
} = require("../.test-build/opakovani.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}
const den = (s) => new Date(`${s}T12:00:00`);

console.log("── měsíční opakování ──");
{
  const t = chybejiciTerminy({ zacina: "2026-01-15", frekvence: "mesicne" }, den("2026-04-20"));
  ok("vytvoří leden až duben", t.join(",") === "2026-01-15,2026-02-15,2026-03-15,2026-04-15");
  ok("nic z budoucnosti", t.every((d) => d <= "2026-04-20"));
}
{
  // Kdyby se počítalo od minule vytvořeného, byl by z 31. ledna 28. únor
  // a od března už napořád 28. — výdaj by se posouval každý rok o pár dní.
  const t = chybejiciTerminy({ zacina: "2026-01-31", frekvence: "mesicne" }, den("2026-04-05"));
  ok("konec měsíce se v únoru zkrátí", t[1] === "2026-02-28");
  ok("a v březnu je zase 31.", t[2] === "2026-03-31");
}

console.log("── ostatní frekvence ──");
{
  const t = chybejiciTerminy({ zacina: "2026-03-02", frekvence: "tydne" }, den("2026-03-23"));
  ok("týdně sedí na stejný den v týdnu", t.join(",") === "2026-03-02,2026-03-09,2026-03-16,2026-03-23");
}
{
  const t = chybejiciTerminy({ zacina: "2026-01-10", frekvence: "ctvrtletne" }, den("2026-08-01"));
  ok("čtvrtletně = po třech měsících", t.join(",") === "2026-01-10,2026-04-10,2026-07-10");
}
{
  const t = chybejiciTerminy({ zacina: "2024-09-01", frekvence: "rocne" }, den("2026-09-02"));
  ok("ročně dá tři roky", t.join(",") === "2024-09-01,2025-09-01,2026-09-01");
}

console.log("── konec opakování ──");
{
  const t = chybejiciTerminy(
    { zacina: "2026-01-15", konci: "2026-03-01", frekvence: "mesicne" },
    den("2026-06-01"),
  );
  ok("po konci se už nic nevytvoří", t.join(",") === "2026-01-15,2026-02-15");
}
{
  const t = chybejiciTerminy({ zacina: "2026-09-01", frekvence: "mesicne" }, den("2026-06-01"));
  ok("šablona začínající v budoucnu zatím nedělá nic", t.length === 0);
}

console.log("── idempotence ──");
{
  const zadani = { zacina: "2026-01-15", frekvence: "mesicne" };
  const prvni = chybejiciTerminy(zadani, den("2026-04-20"));
  const druhy = chybejiciTerminy(zadani, den("2026-04-20"), prvni);
  ok("druhý běh nic nepřidá", druhy.length === 0);
  const chybi = chybejiciTerminy(zadani, den("2026-04-20"), prvni.slice(0, 2));
  ok("dogeneruje jen to, co chybí", chybi.join(",") === "2026-03-15,2026-04-15");
}

console.log("── odolnost ──");
{
  const t = chybejiciTerminy({ zacina: "2015-01-01", frekvence: "mesicne" }, den("2026-01-01"));
  ok("stará šablona nevysype vše naráz", t.length === MAX_TERMINU_ZA_BEH);
  ok("bere se od nejstaršího", t[0] === "2015-01-01");
}
{
  ok("nesmyslné datum nespadne", chybejiciTerminy({ zacina: "nesmysl", frekvence: "mesicne" }, den("2026-01-01")).length === 0);
}

console.log("── příští termín ──");
{
  ok(
    "ukáže nejbližší budoucí",
    pristiTermin({ zacina: "2026-01-15", frekvence: "mesicne" }, den("2026-04-20")) === "2026-05-15",
  );
  ok(
    "po konci už žádný není",
    pristiTermin({ zacina: "2026-01-15", konci: "2026-03-01", frekvence: "mesicne" }, den("2026-04-20")) === null,
  );
  ok(
    "u budoucí šablony je to ten první",
    pristiTermin({ zacina: "2026-09-01", frekvence: "mesicne" }, den("2026-06-01")) === "2026-09-01",
  );
}

console.log("── kotva ──");
{
  const d = termin(den("2026-01-31"), "mesicne", 13);
  ok("13 měsíců od 31. 1. 2026 je 28. 2. 2027", d.toISOString().slice(0, 10) === "2027-02-28");
}

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\nSelhalo: ${selhalo}`);
process.exit(selhalo === 0 ? 0 : 1);
