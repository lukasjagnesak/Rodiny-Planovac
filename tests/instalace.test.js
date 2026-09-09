/**
 * Přidání na plochu — komu se co nabídne.
 *
 * Nejdražší chyba tady není, že se nabídka neukáže, ale že se ukáže
 * blbě: člověku, který aplikaci na ploše dávno má, nebo návod pro
 * iPhone někomu s Androidem. Obojí vypadá, jako by aplikace nevěděla,
 * kde běží.
 *
 * Spouští se přes `npm run test:instalace`.
 */
const {
  jeSpustenaJakoAplikace,
  jeApple,
  zpusobInstalace,
} = require("../.test-build/instalace.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

console.log("── běží to už jako aplikace? ──");
ok("v prohlížeči ne", jeSpustenaJakoAplikace(false, false) === false);
ok("standalone na Androidu ano", jeSpustenaJakoAplikace(true, false) === true);
ok("starší iOS hlásí po svém", jeSpustenaJakoAplikace(false, true) === true);
ok("chybějící iOS příznak nevadí", jeSpustenaJakoAplikace(false, undefined) === false);

console.log("── poznání Applu ──");
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15";
const IPAD_JAKO_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126";

ok("iPhone", jeApple(IPHONE, 5) === true);
ok("iPad se hlásí jako Mac, pozná se podle dotyku", jeApple(IPAD_JAKO_MAC, 5) === true);
ok("skutečný Mac ne", jeApple(MAC, 0) === false);
ok("Android ne", jeApple(ANDROID, 5) === false);

console.log("── co komu nabídnout ──");
ok(
  "nainstalované aplikaci se instalace nenabízí",
  zpusobInstalace({ jakoAplikace: true, maVyzvu: true, apple: false }) === "nic",
);
ok(
  "ani na iPhonu, když už ji má",
  zpusobInstalace({ jakoAplikace: true, maVyzvu: false, apple: true }) === "nic",
);
ok(
  "výzva od Chromu je přednost",
  zpusobInstalace({ jakoAplikace: false, maVyzvu: true, apple: false }) === "vyzva",
);
ok(
  "iPhone bez výzvy dostane návod",
  zpusobInstalace({ jakoAplikace: false, maVyzvu: false, apple: true }) === "navod-ios",
);
// Kdyby Apple někdy `beforeinstallprompt` zavedl, tlačítko na jedno
// ťuknutí musí vyhrát nad návodem — ne aby se ukázalo obojí.
ok(
  "výzva vyhraje i na Applu",
  zpusobInstalace({ jakoAplikace: false, maVyzvu: true, apple: true }) === "vyzva",
);
ok(
  "prohlížeč bez podpory nenabízí nic",
  zpusobInstalace({ jakoAplikace: false, maVyzvu: false, apple: false }) === "nic",
);

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
