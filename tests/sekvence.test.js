/**
 * E-mailové sekvence — komu, co a kdy.
 *
 * Dvě chyby jsou tu nevratné, protože se dějí v cizí schránce. První je
 * poslat tutéž zprávu dvakrát. Druhá je poslat naráz celou sekvenci
 * někomu, kdo se přihlásil před měsícem — což by se stalo v den, kdy se
 * nová sekvence nasadí, kdyby ji nic nedrželo.
 *
 * A odhlašovací odkaz musí platit jen pro tu adresu, které byl vydán.
 * Jinak stačí znát cizí e-mail a odstřihnout ho.
 *
 * Spouští se přes `npm run test:sekvence`.
 */
process.env.PROVOZ_SUL = "testovaci-sul-pro-podpisy";

const { krokKOdeslani, jeVOkne, sekvenceProMagnet, NEJSTARSI_DNY } = require("../.test-build/sekvence.js");
const { podpis, podpisSedi, normalizuj, odhlasovaciOdkaz } = require("../.test-build/odhlaseni.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const HODINA = 60 * 60 * 1000;
const DEN = 24 * HODINA;
const zprava = () => ({ predmet: "x", html: "x", text: "x" });

const SEKVENCE = {
  klic: "vzor-dohody",
  magnety: ["vzor-dohody"],
  kroky: [
    { klic: "dik", poHodinach: 0, zprava },
    { klic: "co-dal", poHodinach: 72, zprava },
    { klic: "nabidka", poHodinach: 168, zprava },
  ],
};

const ZACATEK = new Date("2026-09-01T08:00:00Z");
const za = (ms) => new Date(ZACATEK.getTime() + ms);

console.log("── který krok je na řadě ──");
ok("hned po přihlášení první", krokKOdeslani(SEKVENCE, ZACATEK, ZACATEK, [])?.klic === "dik");
ok(
  "po prvním se druhý čeká",
  krokKOdeslani(SEKVENCE, ZACATEK, za(HODINA), ["dik"]) === null,
);
ok(
  "za tři dny druhý",
  krokKOdeslani(SEKVENCE, ZACATEK, za(73 * HODINA), ["dik"])?.klic === "co-dal",
);
ok(
  "za týden třetí",
  krokKOdeslani(SEKVENCE, ZACATEK, za(169 * HODINA), ["dik", "co-dal"])?.klic === "nabidka",
);
ok(
  "hotová sekvence už nic neposílá",
  krokKOdeslani(SEKVENCE, ZACATEK, za(30 * DEN), ["dik", "co-dal", "nabidka"]) === null,
);

console.log("── nikdy víc než jeden najednou ──");
// Tohle je ta pojistka, která zabrání tomu, aby po výpadku cronu
// spadly člověku do schránky tři zprávy v jedné minutě.
ok(
  "po dlouhé pauze se pošle jen ten nejstarší nesplacený",
  krokKOdeslani(SEKVENCE, ZACATEK, za(30 * DEN), [])?.klic === "dik",
);
ok(
  "a při dalším běhu ten další",
  krokKOdeslani(SEKVENCE, ZACATEK, za(30 * DEN), ["dik"])?.klic === "co-dal",
);

console.log("── nesmysly na vstupu ──");
ok(
  "čas pozpátku nic nepošle",
  krokKOdeslani(SEKVENCE, ZACATEK, new Date(ZACATEK.getTime() - HODINA), []) === null,
);
ok(
  "sekvence bez kroků nespadne",
  krokKOdeslani({ klic: "x", magnety: [], kroky: [] }, ZACATEK, ZACATEK, []) === null,
);

console.log("── kdo do sekvence vůbec vstoupí ──");
ok("čerstvý kontakt ano", jeVOkne(ZACATEK, za(HODINA)) === true);
ok("na hraně okna ještě ano", jeVOkne(ZACATEK, za(NEJSTARSI_DNY * DEN - HODINA)) === true);
// Bez tohohle by v den nasazení dostali „děkujeme za stažení" všichni,
// kdo si kdy něco stáhli — i lidé z loňska.
ok("starý kontakt ne", jeVOkne(ZACATEK, za((NEJSTARSI_DNY + 1) * DEN)) === false);

console.log("── ke kterému materiálu sekvence patří ──");
ok("známý materiál", sekvenceProMagnet("vzor-dohody", [SEKVENCE])?.klic === "vzor-dohody");
ok("neznámý materiál nic nespustí", sekvenceProMagnet("newsletter", [SEKVENCE]) === null);

console.log("── odhlašovací odkaz ──");
const MAIL = "Jan.Novak@Example.CZ";
ok("adresa se normalizuje", normalizuj(MAIL) === "jan.novak@example.cz");
ok("podpis sedí sám sobě", podpisSedi(MAIL, podpis(MAIL)) === true);
ok("nezáleží na velikosti písmen", podpisSedi("jan.novak@example.cz", podpis(MAIL)) === true);
ok("cizí adresa neprojde", podpisSedi("nekdo.jiny@example.cz", podpis(MAIL)) === false);
ok("zkomolený podpis neprojde", podpisSedi(MAIL, podpis(MAIL).slice(0, -1) + "x") === false);
ok("prázdný podpis neprojde", podpisSedi(MAIL, "") === false);
ok(
  "odkaz nese adresu i podpis",
  (() => {
    const u = new URL(odhlasovaciOdkaz("https://klidoo.cz", MAIL));
    return (
      u.pathname === "/odhlasit" &&
      u.searchParams.get("e") === "jan.novak@example.cz" &&
      podpisSedi(MAIL, u.searchParams.get("t"))
    );
  })(),
);

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
process.exit(selhalo === 0 ? 0 : 1);
