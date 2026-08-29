/**
 * Šablony e-mailů.
 *
 * U e-mailu se chyba pozná až u příjemce, kde už ji nevezmeš zpět —
 * escapování, textová verze i odkaz musí sedět předtím, než se odešle.
 *
 * Spouští se přes `npm run test:mail`.
 */
const {
  escapeHtml,
  pozvankaZprava,
  konecZkusebnihoZprava,
  platbaSelhalaZprava,
} = require("../.test-build/mail-sablony.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

console.log("── escapování ──");
{
  ok("uzavře značku", escapeHtml("<script>") === "&lt;script&gt;");
  ok("ošetří uvozovky", escapeHtml('a"b') === "a&quot;b");
  ok("ampersand první", escapeHtml("&lt;") === "&amp;lt;");
}

console.log("── pozvánka ──");
{
  const z = pozvankaZprava({
    odesilatel: "Lukáš",
    rodina: "Novákovi",
    odkaz: "https://klidoo.cz/pozvanka/abc123",
  });
  ok("předmět jmenuje toho, kdo zve", z.predmet.includes("Lukáš"));
  ok("odkaz je v HTML", z.html.includes("https://klidoo.cz/pozvanka/abc123"));
  ok("odkaz je i v textu", z.text.includes("https://klidoo.cz/pozvanka/abc123"));
  ok("textová verze není prázdná", z.text.trim().length > 80);
  ok("říká, že druhý rodič neplatí", z.html.includes("Nic neplatíš"));
  ok("žádné externí obrázky", !/<img/i.test(z.html));
  ok("žádné skripty", !/<script/i.test(z.html));
}
{
  // Jméno rodiny píše uživatel — nesmí se dostat do HTML syrové.
  const z = pozvankaZprava({
    odesilatel: '<img src=x onerror="alert(1)">',
    rodina: "Rodina & spol.",
    odkaz: "https://klidoo.cz/pozvanka/x",
  });
  ok("jméno se escapuje", !z.html.includes("<img src=x"));
  ok("ampersand v názvu se escapuje", z.html.includes("Rodina &amp; spol."));
}
{
  const z = pozvankaZprava({ odesilatel: "  ", rodina: "  ", odkaz: "https://klidoo.cz/p/1" });
  ok("prázdné jméno má náhradu", z.predmet.includes("Druhý rodič"));
}

console.log("── konec zkušebního období ──");
{
  ok(
    "poslední den mluví o dnešku",
    konecZkusebnihoZprava({ jmeno: "Jan", dni: 1, odkaz: "https://klidoo.cz/predplatne" }).predmet.includes("dnes"),
  );
  const z = konecZkusebnihoZprava({ jmeno: "Jan", dni: 3, odkaz: "https://klidoo.cz/predplatne" });
  ok("tři dny mají správný tvar", z.predmet.includes("3 dny"));
  ok("slibuje, že se nic nesmaže", z.text.includes("Nic se nesmaže"));
  const zaporne = konecZkusebnihoZprava({ jmeno: "", dni: -2, odkaz: "https://klidoo.cz/predplatne" });
  ok("záporný počet dní nespadne na nesmysl", zaporne.predmet.includes("dnes"));
}

console.log("── neúspěšná platba ──");
{
  const z = platbaSelhalaZprava({ odkaz: "https://klidoo.cz/predplatne" });
  ok("nestraší zámkem hned", !z.text.includes("zamčen"));
  ok("odkaz vede na předplatné", z.html.includes("/predplatne"));
}

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\nSelhalo: ${selhalo}`);
process.exit(selhalo === 0 ? 0 : 1);
