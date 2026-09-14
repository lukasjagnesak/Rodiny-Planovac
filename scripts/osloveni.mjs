/**
 * Vykání v celém produktu.
 *
 * Klidoo chodí ke klientům přes mediátory a advokáty a používá se jako
 * podklad pro soud. Tykání by v takovém řetězci znělo nepatřičně a
 * míchané oslovení je navíc to první, podle čeho se pozná, že si textů
 * nikdo pořádně nevšímal. E-maily vykají už dřív, tohle dorovnává web
 * i aplikaci.
 *
 * Převádí se jen text v uvozovkách. Slovník je úplný výčet tvarů, které
 * se v projektu opravdu vyskytly — žádné odvozování podle koncovky,
 * protože „nejspíš" ani „Lukáš" nejsou slovesa ve druhé osobě.
 *
 * Pouští se s `--oprav`, jinak jen hlásí. Kontrola je v `npm test`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const OPRAVIT = process.argv.includes("--oprav");

const SLOVNIK = {
  // zájmena
  ti: "vám", tě: "vás", tebe: "vás", tobě: "vám",
  tvůj: "váš", tvoje: "vaše", tvá: "vaše", tvé: "vaše",
  tvého: "vašeho", tvojí: "vaší", tvoji: "vaši", tvou: "vaši",
  tvým: "vaším", tvých: "vašich",
  // slovesa ve druhé osobě jednotného čísla
  můžeš: "můžete", uvidíš: "uvidíte", zkoušíš: "zkoušíte", nemáš: "nemáte",
  budeš: "budete", nastavíš: "nastavíte", chceš: "chcete", vyfotíš: "vyfotíte",
  zadáš: "zadáte", odešleš: "odešlete", přepínáš: "přepínáte", dostaneš: "dostanete",
  otevřeš: "otevřete", najdeš: "najdete", nevypneš: "nevypnete",
  přihlašuješ: "přihlašujete", nepotřebuješ: "nepotřebujete", pošleš: "pošlete",
  přijmeš: "přijmete", jmenuješ: "jmenujete", nezadáváš: "nezadáváte",
  uložíš: "uložíte", naklikáš: "naklikáte", nenaplánuješ: "nenaplánujete",
  nemusíš: "nemusíte", zaplatíš: "zaplatíte", zadáváš: "zadáváte",
  rozhodneš: "rozhodnete", ušetříš: "ušetříte", zvolíš: "zvolíte",
  určíš: "určíte", zrušíš: "zrušíte", máš: "máte", vidíš: "vidíte",
  víš: "víte", jsi: "jste", ses: "jste se", sis: "jste si",
  // rozkazovací způsob
  napiš: "napište", zadej: "zadejte", klikni: "klikněte", vyber: "vyberte",
  přidej: "přidejte", otevři: "otevřete", zkus: "zkuste", ulož: "uložte",
  smaž: "smažte", pošli: "pošlete", stáhni: "stáhněte", vyfoť: "vyfoťte",
  nastav: "nastavte", zavři: "zavřete", začni: "začněte", požádej: "požádejte",
  přerovnej: "přerovnejte", spočítej: "spočítejte", vyplň: "vyplňte",
  sjeď: "sjeďte", potvrď: "potvrďte", zkontroluj: "zkontrolujte",
  vytiskni: "vytiskněte", odešli: "odešlete", vrať: "vraťte",
  nevidíš: "nevidíte", používáš: "používáte", uděláš: "uděláte",
  potřebuješ: "potřebujete", pořídíš: "pořídíte", neplatíš: "neplatíte",
  zůstaneš: "zůstanete", nechceš: "nechcete", nevíš: "nevíte",
  nezvládáš: "nezvládáte", píšeš: "píšete", čteš: "čtete",
  pozveš: "pozvete", poznáš: "poznáte", změníš: "změníte",
  nepřijdeš: "nepřijdete", zapomeneš: "zapomenete", zapneš: "zapnete",
  neuložíš: "neuložíte", předplatíš: "předplatíte", vezeš: "vezete",
  vyplníš: "vyplníte", nahraješ: "nahrajete", vybereš: "vyberete",
  doplníš: "doplníte", opravíš: "opravíte", zavřeš: "zavřete",
  posuneš: "posunete", přepneš: "přepnete", schováš: "schováte",
  vrátíš: "vrátíte", klikneš: "kliknete", přestaneš: "přestanete",
  zobrazíš: "zobrazíte", předplatíš: "předplatíte",
};

/**
 * Věty, kde tykání zůstává.
 *
 * Citovaná řeč mezi rodiči. „Prosím vás, ještě…" by z rodiče, který
 * píše druhému rodiči, udělal úředníka.
 */
const VYJIMKY = ["prosím tě", "řekni tátovi", "řekni mámě"];

const P = "a-zA-ZěščřžýáíéúůďťňĚŠČŘŽÝÁÍÉÚŮĎŤŇ";
const VZOR = new RegExp(
  `(?<![${P}])(${Object.keys(SLOVNIK).join("|")})(?![${P}])`,
  "giu",
);

function zachovejVelikost(puvodni, novy) {
  if (puvodni[0] === puvodni[0].toUpperCase() && puvodni[0] !== puvodni[0].toLowerCase()) {
    return novy[0].toUpperCase() + novy.slice(1);
  }
  return novy;
}

/**
 * Text v JSX není v uvozovkách, takže se musí projít zvlášť.
 *
 * Řádek po řádku, s vynechanými komentáři — ty píšeme vývojářům a
 * převádět je nemá smysl. A vynechává se všechno, za čím stojí závorka:
 * `zkus(` a `nastav(` jsou názvy funkcí, ne rozkazovací způsob.
 */
function upravJsx(radek) {
  if (/^\s*(\/\/|\*|\/\*)/.test(radek)) return radek;

  const casti = radek.split(/("[^"]*")/);
  return casti
    .map((cast, i) => {
      if (i % 2 === 1) return cast; // uvozovky řeší první průchod
      return cast.replace(VZOR, (slovo, _shoda, pozice, cely) => {
        const nahrada = SLOVNIK[slovo.toLowerCase()];
        if (!nahrada) return slovo;
        // Kód, ne text: `zkus(`, `nastav(`, `.vyber`, `vyber)` i
        // `const vyber =`. Dvě proměnné se takhle přejmenovaly a shodil
        // to až `tsc`.
        const za = cely[pozice + slovo.length] ?? " ";
        const pred = cely.slice(0, pozice).trimEnd().slice(-1);
        // Tečka ani čárka za slovem nic neznamenají — tak končí věta.
        // Hlídá se jen to, co vypadá jako kód. Kdyby přesto něco
        // proklouzlo a přejmenovalo proměnnou, shodí to `tsc`.
        if ("([=".includes(za)) return slovo;
        if ("(.=".includes(pred)) return slovo;
        return zachovejVelikost(slovo, nahrada);
      });
    })
    .join("");
}

const soubory = execSync(
  "find src -type f \\( -name '*.tsx' -o -name '*.ts' \\)",
  { encoding: "utf8" },
).trim().split("\n");

let celkem = 0;
const dotcene = [];

for (const soubor of soubory) {
  const puvodni = readFileSync(soubor, "utf8");
  let zmen = 0;

  const novy = puvodni.replace(/"([^"\\\n]+)"/g, (cely, obsah) => {
    if (!obsah.includes(" ") || !/[ěščřžýáíéúůďťň ]/i.test(obsah)) return cely;
    if (VYJIMKY.some((v) => obsah.toLowerCase().includes(v))) return cely;

    const upraveny = obsah.replace(VZOR, (slovo) => {
      const nahrada = SLOVNIK[slovo.toLowerCase()];
      if (!nahrada) return slovo;
      zmen++;
      return zachovejVelikost(slovo, nahrada);
    });

    return upraveny === obsah ? cely : `"${upraveny}"`;
  });

  const sJsx = novy
    .split("\n")
    .map((radek) => {
      const upraveny = upravJsx(radek);
      if (upraveny !== radek) zmen++;
      return upraveny;
    })
    .join("\n");

  if (zmen > 0) {
    celkem += zmen;
    dotcene.push(`${soubor} (${zmen})`);
    if (OPRAVIT) writeFileSync(soubor, sJsx);
  }
}

if (celkem === 0) {
  console.log("✓ Texty vykají.");
  process.exit(0);
}

console.log(OPRAVIT ? "Převedeno na vykání:" : "Ještě se tyká:");
for (const d of dotcene) console.log("   " + d);
console.log(`\n${celkem} tvarů v ${dotcene.length} souborech.`);
if (!OPRAVIT) console.log("Spusť `npm run osloveni` a změny si projdi v `git diff`.");
process.exit(OPRAVIT ? 0 : 1);
