/**
 * Vlastní rozvržení přehledu.
 *
 * Uložený tvar je pole v pořadí, ve kterém se karty kreslí; vypnutá karta
 * v poli zůstává s pomlčkou na začátku. Bez té pomlčky by nešlo poznat
 * „tuhle kartu rodič vypnul" od „tahle karta tehdy ještě neexistovala" —
 * a každá nová karta by u starých účtů zůstala navždycky schovaná.
 *
 * Spouští se přes `npm run test:prehled`.
 */
const {
  KARTY,
  serazeneKarty,
  ulozitelnyTvar,
  zapnuteKarty,
  posun,
  prepni,
  jeUpravene,
} = require("../.test-build/prehled-karty.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const id = (karty) => karty.map((k) => k.id);

console.log("── rodič, který si nic nenastavil ──");
ok("prázdné nastavení = výchozí pořadí", id(serazeneKarty(null)).join() === id(KARTY).join());
ok("prázdné pole taky", id(serazeneKarty([])).join() === id(KARTY).join());
ok("a všechno je zapnuté", serazeneKarty(null).every((k) => k.zapnuta));

console.log("── uložené pořadí se dodrží ──");
{
  const v = serazeneKarty(["vydaje", "dnes"]);
  ok("první je útrata", v[0].id === "vydaje");
  ok("druhý je dnes u koho", v[1].id === "dnes");
  ok("zbytek karet nezmizí", v.length === KARTY.length);
}

console.log("── vypnutá karta ──");
{
  const v = serazeneKarty(["dnes", "-vydaje", "noci"]);
  const vydaje = v.find((k) => k.id === "vydaje");
  ok("pomlčka znamená vypnuto", vydaje.zapnuta === false);
  ok("ale pořadí si drží", id(v).indexOf("vydaje") === 1);
  ok("do přehledu se nedostane", !id(zapnuteKarty(["dnes", "-vydaje"])).includes("vydaje"));
}

console.log("── nová karta v nové verzi aplikace ──");
{
  // Rodič uložil rozvržení, když existovaly jen dvě karty. Zbytek musí
  // naskočit sám — jinak by o novinky přišel a nikdy by se o nich
  // nedozvěděl.
  const v = serazeneKarty(["-dnes", "noci"]);
  ok("vypnutá zůstane vypnutá", v.find((k) => k.id === "dnes").zapnuta === false);
  const nove = v.filter((k) => k.id !== "dnes" && k.id !== "noci");
  ok("neznámé karty se přidají", nove.length === KARTY.length - 2);
  ok("a jsou zapnuté", nove.every((k) => k.zapnuta));
}

console.log("── co přijde z databáze pokažené ──");
ok("neznámé jméno se zahodí", !id(serazeneKarty(["vymyslena", "dnes"])).includes("vymyslena"));
ok(
  "zdvojená karta se počítá jednou",
  id(serazeneKarty(["dnes", "dnes"])).filter((x) => x === "dnes").length === 1,
);
ok("samý nesmysl = výchozí sada", serazeneKarty(["a", "b"]).length === KARTY.length);
ok(
  "vypnutá zdvojenina si nechá první výskyt",
  serazeneKarty(["dnes", "-dnes"]).find((k) => k.id === "dnes").zapnuta === true,
);

console.log("── tam a zpátky ──");
{
  const puvodni = ["-vydaje", "dnes", "noci"];
  const tam = serazeneKarty(puvodni);
  const zpet = ulozitelnyTvar(tam);
  ok("uložený tvar začíná tím, co bylo uložené", zpet.slice(0, 3).join() === puvodni.join());
  ok("a projde druhým kolem beze změny", ulozitelnyTvar(serazeneKarty(zpet)).join() === zpet.join());
}

console.log("── posouvání ──");
{
  const v = serazeneKarty(null);
  ok("dolů posune o jedno", posun(v, v[0].id, 1)[1].id === v[0].id);
  ok("nahoru taky", posun(v, v[1].id, -1)[0].id === v[1].id);
  ok("z prvního nahoru se nic nestane", posun(v, v[0].id, -1)[0].id === v[0].id);
  ok(
    "z posledního dolů taky ne",
    posun(v, v[v.length - 1].id, 1)[v.length - 1].id === v[v.length - 1].id,
  );
  ok("neznámá karta nic nerozhodí", posun(v, "vymyslena", 1).length === v.length);
  ok("posun nemění počet karet", posun(v, v[2].id, 1).length === v.length);
}

console.log("── přepínání ──");
{
  const v = serazeneKarty(null);
  const po = prepni(v, "vydaje");
  ok("vypne zapnutou", po.find((k) => k.id === "vydaje").zapnuta === false);
  ok("a zpátky zapne", prepni(po, "vydaje").find((k) => k.id === "vydaje").zapnuta === true);
  ok("pořadí se přepnutím nemění", id(po).join() === id(v).join());
}

console.log("── kdy nabídnout výchozí pořadí ──");
ok("čerstvé rozvržení upravené není", jeUpravene(serazeneKarty(null)) === false);
ok("po vypnutí karty je", jeUpravene(prepni(serazeneKarty(null), "dnes")) === true);
ok("po přerovnání taky", jeUpravene(posun(serazeneKarty(null), "dnes", 1)) === true);

console.log("── karty samotné ──");
ok("žádné dvě nemají stejné id", new Set(id(KARTY)).size === KARTY.length);
ok("všechny mají název i popis", KARTY.every((k) => k.nazev && k.popis));
ok("a rozumnou šířku", KARTY.every((k) => k.sirka === "plna" || k.sirka === "pul"));

console.log(selhalo === 0 ? "\nVšechno sedí." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
