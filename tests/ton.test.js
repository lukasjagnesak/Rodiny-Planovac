/**
 * Hlídač tónu — co má upozornit a co ne. Falešný poplach je skoro stejně
 * špatný jako přehlédnutá urážka: rodič, kterého hlídač zlobí u každé
 * druhé věty, ho vypne. Spouští se přes `npm run test:ton`.
 */
const { zkontrolujTon, druhyNalezu, ztisit } = require("../.test-build/lib/ton.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}
const druhy = (t) => druhyNalezu(zkontrolujTon(t));

console.log("── upozorní ──");
ok("urážka", druhy("Jsi debil.").includes("urazka"));
ok("urážka v jiném tvaru", druhy("Ty hysterko jedna").includes("urazka"));
ok("výhrůžka", druhy("Uvidíš, dám tě k soudu.").includes("vyhruzka"));
ok("obviňování", druhy("Je to tvoje chyba, že Ema nemá úkoly.").includes("obvinovani"));
ok("vždycky na druhého", druhy("Ty vždycky přijdeš pozdě.").includes("absolutni"));
ok("nikdy s 2. osobou slovesa", druhy("Nikdy mi nedáš vědět včas.").includes("absolutni"));
ok("křik velkými", druhy("TO SNAD NENÍ MOŽNÉ").includes("krik"));
ok("vykřičníky", druhy("Kde jsi byl!!!").includes("krik"));
ok("ironie", druhy("No jasně, zase pozdě.").includes("ironie"));
ok("bez diakritiky", druhy("ty jsi uplny debil").includes("urazka"));

console.log("── neupozorní ──");
const klidne = [
  "Ve čtvrtek vyzvednu Kubu až v 17:00, mám poradu.",
  "Vždycky v pátek předáváme ve škole, platí to i tento týden?",
  "Kravata na focení je ve skříni.",
  "Mám pracovní neschopnost do pátku.",
  "Ema chodí do ZŠ a ZUŠ, OSPOD jsme řešili loni.",
  "Díky, že jsi ho vzal.",
  "Pořád platí, že kroužek je ve středu?",
];
for (const t of klidne) ok(`„${t}“`, zkontrolujTon(t).length === 0);

console.log("── úryvky a zmírnění ──");
const n = zkontrolujTon("Ahoj, ty jsi debil.");
ok("úryvek sedí s textem", n.every((x) => "Ahoj, ty jsi debil.".slice(x.start, x.konec) === x.uryvek));
ok("bez překryvů", n.every((x, i) => i === 0 || x.start >= n[i - 1].konec));
ok("ztišit: velká písmena a vykřičníky", ztisit("TO SNAD NENÍ MOŽNÉ!!!") === "To snad není možné!");
ok("ztišit nechá zkratky", ztisit("Ve ZŠ a OSPOD!!") === "Ve ZŠ a OSPOD!");

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
