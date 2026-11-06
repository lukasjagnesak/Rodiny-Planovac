/**
 * Oslovení v 5. pádě. Spouští se přes `npm run test:vokativ`.
 */
const { vokativ } = require("../.test-build/lib/vokativ.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const PARY = [
  ["Petr", "Petře"], ["Jan", "Jane"], ["Martin", "Martine"], ["Tomáš", "Tomáši"],
  ["Lukáš", "Lukáši"], ["Marek", "Marku"], ["Radek", "Radku"], ["Zdeněk", "Zdeňku"],
  ["Pavel", "Pavle"], ["Karel", "Karle"], ["Daniel", "Danieli"], ["Michal", "Michale"],
  ["Jakub", "Jakube"], ["Ondřej", "Ondřeji"], ["Matěj", "Matěji"], ["Jiří", "Jiří"],
  ["Patrik", "Patriku"], ["Vojtěch", "Vojtěchu"], ["Oldřich", "Oldřichu"], ["Alexandr", "Alexandře"],
  ["Viktor", "Viktore"], ["Václav", "Václave"], ["David", "Davide"], ["Filip", "Filipe"],
  ["Adam", "Adame"], ["Josef", "Josefe"], ["Max", "Maxi"], ["Honza", "Honzo"],
  ["Jana", "Jano"], ["Petra", "Petro"], ["Eva", "Evo"], ["Kateřina", "Kateřino"],
  ["Lucie", "Lucie"], ["Marie", "Marie"], ["Dagmar", "Dagmar"], ["Ema", "Emo"],
  ["Tobiáš", "Tobiáši"], ["Šárka", "Šárko"],
];
for (const [z, na] of PARY) ok(`${z} → ${na}`, vokativ(z) === na);
ok("prázdné zůstane prázdné", vokativ("") === "");
ok("mezery okolo se zahodí", vokativ("  Petr ") === "Petře");

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
