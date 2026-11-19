/**
 * Rozpad stahování z EduPage po dětech.
 *
 * Spárované dítě, kterému z timeline nepřišlo nic, je skoro vždycky
 * chyba — přepnutí účtu neprošlo, párování ukazuje na cizí ID, nebo
 * škola u toho dítěte nic nesdílí. Dokud se to nikde nenapsalo, vypadalo
 * takové stažení navenek stejně jako povedené: „Staženo 47 položek."
 * Rodina se dvěma dětmi tak měsíce viděla data jen k jednomu z nich
 * a aplikace u toho hlásila úspěch.
 *
 * Spouští se přes `npm run test:edupage-souhrn`.
 */
const { varovaniZeSouhrnu } = require("../.test-build/edupage-souhrn.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const dite = (jmeno, udalosti, ulozeno = udalosti, chyba) => ({
  jmeno,
  udalosti,
  ulozeno,
  ...(chyba ? { chyba } : {}),
});

console.log("── obě děti něco přinesly ──");
ok("nic se nehlásí", varovaniZeSouhrnu([dite("Ema", 12), dite("Tobiáš", 8)]).length === 0);

console.log("── druhé dítě mlčí ──");
{
  const v = varovaniZeSouhrnu([dite("Ema", 12), dite("Tobiáš", 0, 0)]);
  ok("varování se objeví", v.length === 1);
  ok("a jmenuje to dítě", v[0].includes("Tobiáš"));
  ok("Emu neobviňuje", !v[0].includes("Ema"));
  ok("poradí, kam se podívat", /Nastaven/i.test(v[0]));
}

console.log("── mlčí obě ──");
{
  const v = varovaniZeSouhrnu([dite("Ema", 0, 0), dite("Tobiáš", 0, 0)]);
  ok("řekne se to jednou, ne dvakrát", v.length === 1);
  ok("a jinými slovy", v[0].includes("žádnému"));
}

console.log("── dítě, u kterého timeline spadla ──");
{
  // Chybu už hlásí služba sama; opakovat ji jako „nepřišlo nic" by
  // znamenalo dvě hlášky o téže věci.
  const v = varovaniZeSouhrnu([dite("Ema", 12), dite("Tobiáš", 0, 0, "timeout")]);
  ok("nezdvojuje se s chybou ze služby", v.length === 0);
}

console.log("── jedno spárované dítě ──");
{
  // Žákovský účet a rodič s jedním dítětem: prázdno může znamenat jen
  // klidný týden. Bez druhého dítěte není s čím srovnávat.
  ok("prázdno se nehlásí", varovaniZeSouhrnu([dite("Ema", 0, 0)]).length === 0);
  ok("ani u neprázdného", varovaniZeSouhrnu([dite("Ema", 5)]).length === 0);
  ok("prázdný seznam nespadne", varovaniZeSouhrnu([]).length === 0);
}

console.log("── tři děti, mlčí dvě ──");
{
  const v = varovaniZeSouhrnu([dite("Ema", 9), dite("Tobiáš", 0, 0), dite("Mína", 0, 0)]);
  ok("obě chybějící jsou vyjmenované", v[0].includes("Tobiáš") && v[0].includes("Mína"));
}

console.log(selhalo === 0 ? "\nVšechno sedí." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
