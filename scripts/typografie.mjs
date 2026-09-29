/**
 * Česká typografie v textech na webu.
 *
 * Pravidla, která v Česku pozná každý, kdo čte pozorně, a která žádný
 * sestavovač nepohlídá:
 *
 *  - jednopísmenná předložka nesmí zůstat na konci řádku (pevná mezera),
 *  - výpustka je znak „…“, ne tři tečky,
 *  - rozsah a schéma se píše pomlčkou, ne spojovníkem: 2–2–3,
 *  - v částce se neláme mezera mezi řády ani před měnou.
 *
 * Pouští se s `--oprav`, jinak jen vypíše, co je špatně. Kontrola bez
 * opravy je součástí `npm test`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const OPRAVIT = process.argv.includes("--oprav");
const NBSP = " ";

const SOUBORY = execSync(
  "find 'src/app/(web)' src/components/web src/obsah src/lib/brand.ts src/lib/tarify.ts " +
    "-type f \\( -name '*.tsx' -o -name '*.ts' \\)",
  { encoding: "utf8" },
)
  .trim()
  .split("\n");

/** Jen tyhle. „K“ jako iniciála nebo „a“ v kódu se opravovat nemá. */
const PREDLOZKY = "kKsSvVzZoOuUaAiI";

/**
 * Pracuje se jen uvnitř řetězcových literálů delších než deset znaků,
 * které obsahují mezeru a české písmeno. Tím vypadnou názvy tříd,
 * adresy i klíče — ty by se opravou rozbily.
 */
function jeText(retezec) {
  return (
    retezec.length > 10 &&
    retezec.includes(" ") &&
    /[a-zěščřžýáíéúůďťňA-ZĚŠČŘŽÝÁÍÉÚŮĎŤŇ]/.test(retezec) &&
    !/^[a-z0-9:\-\[\]\/. ]+$/.test(retezec) &&
    !retezec.includes("://")
  );
}

function uprav(retezec) {
  let v = retezec;
  v = v.replace(/\.\.\./g, "…");
  v = v.replace(/\b(\d)-(\d)-(\d)\b/g, "$1–$2–$3");
  // mezera mezi řády i před měnou se nesmí lámat
  v = v.replace(/(\d)\s(\d{3})(\s?)(Kč)?/g, (_, a, b, __, mena) =>
    mena ? `${a}${NBSP}${b}${NBSP}${mena}` : `${a}${NBSP}${b}`,
  );
  // Dokola, dokud se něco mění. Sousední předložky („a v lednu") se
  // v jednom průchodu minou: mezera, kterou jedna shoda spotřebuje, je
  // zároveň začátkem té další, a `g` ji už nevezme.
  const predlozka = new RegExp(`(^|[\\s(„"—])([${PREDLOZKY}]) `, "g");
  let pred;
  do {
    pred = v;
    v = v.replace(predlozka, (_, p, pismeno) => `${p}${pismeno}${NBSP}`);
  } while (v !== pred);

  return v;
}

let zmenenoSouboru = 0;
let zmenenoRetezcu = 0;

for (const soubor of SOUBORY) {
  const puvodni = readFileSync(soubor, "utf8");
  let zmen = 0;

  const novy = puvodni.replace(/"([^"\\\n]+)"/g, (cely, obsah) => {
    if (!jeText(obsah)) return cely;
    const opraveny = uprav(obsah);
    if (opraveny === obsah) return cely;
    zmen++;
    return `"${opraveny}"`;
  });

  if (zmen > 0) {
    zmenenoSouboru++;
    zmenenoRetezcu += zmen;
    console.log(`${OPRAVIT ? "opraveno" : "k opravě"}: ${soubor} (${zmen})`);
    if (OPRAVIT) writeFileSync(soubor, novy);
  }
}

if (zmenenoRetezcu === 0) {
  console.log("✓ Typografie v pořádku.");
  process.exit(0);
}

console.log(`\n${zmenenoRetezcu} řetězců v ${zmenenoSouboru} souborech.`);
if (!OPRAVIT) {
  console.log("Spusť `npm run typografie` a změny si projdi v `git diff`.");
}
process.exit(OPRAVIT ? 0 : 1);
