/**
 * Průhlednost barvy pro jemné podbarvení.
 *
 * Odznaky v aplikaci berou podklad z `withAlpha(barva, 0.14)` a text
 * z téže barvy v plné sytosti. Barva ale nemusí být hex — stavové odznaky
 * („bez řidiče", „propojeno") ji předávají jako `var(--warning)`.
 *
 * Dokud se v takovém případě vracela barva nezměněná, vyšel podklad plný
 * a nápis se v něm ztratil: stejná barva na stejné barvě. Na obrazovce
 * to vypadalo jako prázdná kapsle.
 *
 * Spouští se přes `npm run test:barvy`.
 */
const { withAlpha } = require("../.test-build/format.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

console.log("── hex barvy dětí a rodičů ──");
ok("14 % z hexu", withAlpha("#2c8671", 0.14) === "#2c867124");
ok("bez mřížky taky", withAlpha("2c8671", 0.14) === "#2c867124");
ok("plná krytí nechá barvu", withAlpha("#2c8671", 1) === "#2c8671ff");
ok("nula je průhledná", withAlpha("#2c8671", 0) === "#2c867100");

console.log("── CSS proměnná: hex se z ní složit nedá ──");
{
  const v = withAlpha("var(--warning)", 0.14);
  ok("nevrátí se plná barva", v !== "var(--warning)");
  ok("podklad je průhledný", v === "color-mix(in srgb, var(--warning) 14%, transparent)");
}
ok(
  "oklch() přímo taky projde",
  withAlpha("oklch(70% 0.1 75)", 0.14) ===
    "color-mix(in srgb, oklch(70% 0.1 75) 14%, transparent)",
);

console.log("── podklad se nikdy nesmí rovnat textu ──");
for (const barva of ["#2c8671", "var(--warning)", "var(--success)", "var(--danger)", "var(--brand)"]) {
  ok(`${barva} má jiný podklad než text`, withAlpha(barva, 0.14) !== barva);
}

console.log("── co se nedá rozumně zpracovat ──");
ok("zkrácený hex není hex", withAlpha("#abc", 0.14).startsWith("color-mix"));
ok("nesmysl neshodí výpočet", typeof withAlpha("", 0.14) === "string");

console.log(selhalo === 0 ? "\nVšechno sedí." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
