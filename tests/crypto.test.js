/**
 * Šifrování uložených hesel.
 *
 * Když se změní klíč serveru, Node vyhodí „Unsupported state or unable to
 * authenticate data". Tahle hláška se dřív ukázala rodiči v nastavení
 * EduPage a svedla hledání chyby úplně jinam — u EduPage přitom žádná
 * nebyla.
 *
 * Spouští se přes `npm run test:crypto`.
 */
// Balíček `server-only` hlídá, aby serverový modul neskončil v prohlížeči,
// a při načtení z obyčejného node skriptu vyhodí výjimku. V testu žádný
// prohlížeč není, tak mu podstrčíme prázdný modul — jinak by šifrování
// nešlo otestovat vůbec.
const cestaServerOnly = require.resolve("server-only");
require.cache[cestaServerOnly] = {
  id: cestaServerOnly,
  filename: cestaServerOnly,
  loaded: true,
  exports: {},
};

const { encryptSecret, decryptSecret, CHYBA_KLICE } = require("../.test-build/crypto.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const KLIC_A = Buffer.alloc(32, 1).toString("base64");
const KLIC_B = Buffer.alloc(32, 2).toString("base64");

console.log("── tam a zpátky ──");
process.env.TOKEN_ENCRYPTION_KEY = KLIC_A;
const zasifrovane = encryptSecret("tajne-heslo-k-edupage");
ok("rozšifruje se na totéž", decryptSecret(zasifrovane) === "tajne-heslo-k-edupage");
ok("v uloženém tvaru heslo vidět není", !zasifrovane.includes("tajne"));

console.log("── změněný klíč serveru ──");
process.env.TOKEN_ENCRYPTION_KEY = KLIC_B;
let hlaska = "";
try {
  decryptSecret(zasifrovane);
  hlaska = "(nic nespadlo)";
} catch (e) {
  hlaska = e.message;
}
ok("nepustí to dál", hlaska !== "(nic nespadlo)");
ok("neukazuje hlášku z Node", !hlaska.includes("Unsupported state"));
ok("řekne, co se stalo", hlaska === CHYBA_KLICE);
ok("a poradí, co s tím", hlaska.includes("Propoj účet"));

console.log("── poškozený zápis ──");
try {
  decryptSecret("nesmysl");
  ok("poškozený zápis nepustí dál", false);
} catch (e) {
  ok("poškozený zápis nepustí dál", e.message === CHYBA_KLICE);
}

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\nSelhalo: ${selhalo}`);
process.exit(selhalo === 0 ? 0 : 1);
