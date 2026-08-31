/**
 * Adresa školy v EduPage.
 *
 * Pole svádí napsat název školy. Když projde dál, sestaví se z něj adresa
 * `https://ZŠ Mukařov.edupage.org/…` a uživatel dostane anglickou hlášku
 * o neplatné URL — hledá pak chybu u sebe, u hesla nebo u školy.
 *
 * Spouští se přes `npm run test:edupage-adresa`.
 */
const { normalizujSubdomenu } = require("../.test-build/edupage-adresa.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

console.log("── co má projít ──");
ok("prosté jméno", normalizujSubdomenu("zsmukarov").subdomena === "zsmukarov");
ok("velká písmena se srovnají", normalizujSubdomenu("ZSMukarov").subdomena === "zsmukarov");
ok("mezery okolo nevadí", normalizujSubdomenu("  zsmukarov  ").subdomena === "zsmukarov");
ok("pomlčka je povolená", normalizujSubdomenu("zs-mukarov").subdomena === "zs-mukarov");

console.log("── odkaz z prohlížeče ──");
ok(
  "celá adresa",
  normalizujSubdomenu("https://zsmukarov.edupage.org").subdomena === "zsmukarov",
);
ok(
  "adresa i s cestou",
  normalizujSubdomenu("https://zsmukarov.edupage.org/login/?cmd=MainLogin").subdomena ===
    "zsmukarov",
);
ok("bez protokolu", normalizujSubdomenu("zsmukarov.edupage.org").subdomena === "zsmukarov");

console.log("── prázdné = hledat samo ──");
{
  const v = normalizujSubdomenu("");
  ok("nic není chyba", v.subdomena === null && v.chyba === null);
  ok("ani mezery", normalizujSubdomenu("   ").chyba === null);
  ok("ani chybějící hodnota", normalizujSubdomenu(null).chyba === null);
}

console.log("── název školy ──");
{
  const v = normalizujSubdomenu("ZŠ Mukařov");
  ok("nepustí dál", v.subdomena === null);
  ok("řekne, co je špatně", v.chyba !== null && v.chyba.includes("název školy"));
  ok("ukáže příklad správné adresy", v.chyba.includes("zsmukarov"));
  ok("nabídne prázdné pole jako řešení", v.chyba.includes("prázdné"));
  ok("cituje, co člověk napsal", v.chyba.includes("ZŠ Mukařov"));
}
ok("i bez diakritiky, když jsou tam mezery", normalizujSubdomenu("ZS Mukarov").chyba !== null);
ok("samotná diakritika taky", normalizujSubdomenu("zšmukařov").chyba !== null);

console.log("── nesmysly ──");
ok("podtržítko neprojde", normalizujSubdomenu("zs_mukarov").chyba !== null);
ok("nezačíná pomlčkou", normalizujSubdomenu("-zsmukarov").chyba !== null);

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\nSelhalo: ${selhalo}`);
process.exit(selhalo === 0 ? 0 : 1);
