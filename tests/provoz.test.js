/**
 * Výpočty pro dashboard provozu.
 *
 * Špatně spočítaná konverze vede k rozhodnutím o penězích a sama se
 * neprojeví — proto se počítá tady, ne v SQL dotazu na stránce.
 *
 * Spouští se přes `npm run test:provoz`.
 */
const {
  poDnech,
  zebricek,
  trychtyr,
  kanal,
  trychtyrVyzivneho,
  trychtyrRozvrhu,
  jePlacena,
  jeZFacebookAds,
  CESTA_VYZIVNE,
  CESTA_VSTUPNI,
} = require("../.test-build/provoz-souhrn.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

const u = (druh, cas, navstevnik, extra = {}) => ({
  druh,
  cesta: "/",
  zdroj: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  ref: null,
  zarizeni: "mobil",
  navstevnik,
  created_at: cas,
  ...extra,
});

console.log("── návštěvnost po dnech ──");
{
  const data = [
    u("zobrazeni", "2026-03-01T08:00:00Z", "a"),
    u("zobrazeni", "2026-03-01T09:00:00Z", "a"),
    u("zobrazeni", "2026-03-01T10:00:00Z", "b"),
    u("zobrazeni", "2026-03-03T10:00:00Z", "c"),
  ];
  const dny = poDnech(data, "2026-03-01", "2026-03-03");
  ok("vrátí každý den v období", dny.length === 3);
  ok("dvě zobrazení jednoho člověka = jeden návštěvník", dny[0].navstevnici === 2 && dny[0].zobrazeni === 3);
  ok("den bez provozu je nula, ne díra", dny[1].zobrazeni === 0 && dny[1].den === "2026-03-02");
  ok("poslední den sedí", dny[2].navstevnici === 1);
}
{
  const dny = poDnech([], "2026-03-01", "2026-03-02");
  ok("prázdná data nespadnou", dny.length === 2 && dny[0].zobrazeni === 0);
}

console.log("── žebříček zdrojů ──");
{
  const data = [
    u("zobrazeni", "2026-03-01T08:00:00Z", "a", { zdroj: "google.com" }),
    u("zobrazeni", "2026-03-01T09:00:00Z", "a", { zdroj: "google.com" }),
    u("zobrazeni", "2026-03-01T09:00:00Z", "b", { zdroj: "google.com" }),
    u("zobrazeni", "2026-03-01T10:00:00Z", "c", { zdroj: null }),
    u("lead", "2026-03-01T11:00:00Z", "c", { zdroj: "seznam.cz" }),
  ];
  const z = zebricek(data, (x) => x.zdroj);
  ok("první je nejsilnější zdroj", z[0].nazev === "google.com");
  ok("počítají se lidé, ne kliknutí", z[0].pocet === 2);
  ok("bez odkazu = přímo", z[1].nazev === "přímo");
  ok("konverze do žebříčku návštěv nepatří", z.every((r) => r.nazev !== "seznam.cz"));
  ok("podíly dávají sto procent", Math.round(z.reduce((s, r) => s + r.podil, 0)) === 100);
}

console.log("── trychtýř ──");
{
  const data = [
    ...["a", "b", "c", "d"].map((n) => u("zobrazeni", "2026-03-01T08:00:00Z", n)),
    u("zobrazeni", "2026-03-01T08:30:00Z", "a"),
    u("kalkulacka", "2026-03-01T09:00:00Z", "a"),
    u("kalkulacka", "2026-03-01T09:00:00Z", "b"),
    u("registrace", "2026-03-01T10:00:00Z", "a"),
    u("rodina", "2026-03-01T10:05:00Z", "a"),
    u("predplatne", "2026-03-02T10:00:00Z", null),
  ];
  const t = trychtyr(data);
  ok("vrchol jsou návštěvníci, ne zobrazení", t[0].pocet === 4);
  ok("druhý krok sedí", t[1].klic === "kalkulacka" && t[1].pocet === 2);
  ok("konverze z předchozího kroku", t[1].zPredchoziho === 50);
  ok("krok bez události je nula", t.find((k) => k.klic === "druhy_rodic").pocet === 0);
  ok("platba se počítá i bez otisku", t[5].pocet === 1);
  ok("podíl z vrcholu je z návštěv", t[2].zVrcholu === 25);
}
{
  const t = trychtyr([]);
  ok("prázdná data nedělí nulou", t.every((k) => k.pocet === 0 && k.zPredchoziho === 0));
}

console.log("── kanál ──");
{
  ok("partner má přednost", kanal(u("zobrazeni", "", "a", { ref: "advokat-novak", utm_source: "google" })) === "partner: advokat-novak");
  ok("utm se spojí s médiem", kanal(u("zobrazeni", "", "a", { utm_source: "seznam", utm_medium: "cpc" })) === "seznam / cpc");
  ok("jinak doména odkazu", kanal(u("zobrazeni", "", "a", { zdroj: "idnes.cz" })) === "idnes.cz");
  ok("nic z toho = null", kanal(u("zobrazeni", "", "a")) === null);
}

console.log("── kalkulačka výživného ──");
{
  const T = "2026-09-25T10:00:00Z";
  const kalk = { cesta: CESTA_VYZIVNE };
  const reklama = { cesta: CESTA_VYZIVNE, utm_source: "google", utm_medium: "cpc" };
  const data = [
    // a: z reklamy, projde vším a zaregistruje se
    u("zobrazeni", T, "a", reklama),
    u("vyzivne-zadani", T, "a", reklama),
    u("vyzivne-zadani", T, "a", reklama), // přepočítal si to znovu
    u("vyzivne-nabidka-videt", T, "a", reklama),
    u("vyzivne-prenos", T, "a", reklama),
    u("registrace", T, "a", { cesta: "/registrace" }), // už bez označení kampaně
    // b: z reklamy, vyplní a odejde
    u("zobrazeni", T, "b", reklama),
    u("vyzivne-zadani", T, "b", reklama),
    // c: z vyhledávání zdarma, nechá e-mail pro PDF
    u("zobrazeni", T, "c", kalk),
    u("vyzivne-zadani", T, "c", kalk),
    u("vyzivne-nabidka-videt", T, "c", kalk),
    u("lead", T, "c", kalk),
    // d: zaregistruje se, ale na kalkulačce nebyl
    u("zobrazeni", T, "d"),
    u("registrace", T, "d", { cesta: "/registrace" }),
    // e: lead z jiné stránky se sem nepočítá
    u("lead", T, "e", { cesta: "/vzor-dohody-o-stridave-peci" }),
    // f: přijde a klikne na pruh nahoře, dál nic
    u("zobrazeni", T, "f", kalk),
    u("vyzivne-pruh", T, "f", kalk),
  ];
  const vse = trychtyrVyzivneho(data);
  const krok = (t, klic) => t.find((k) => k.klic === klic);

  ok("přišli 4 lidé", krok(vse, "prislo").pocet === 4);
  ok("klik na pruh nahoře se počítá zvlášť", krok(vse, "jinde").pocet === 1);
  ok("a měří se proti všem, kdo přišli", krok(vse, "jinde").zPredchoziho === 25);
  ok("vyplňovali 3 — opakovaný výpočet je pořád jeden člověk", krok(vse, "zadalo").pocet === 3);
  ok("k nabídce došli 2", krok(vse, "videlo").pocet === 2);
  ok("na Vyzkoušet klikl 1", krok(vse, "kliklo").pocet === 1);
  ok("e-mail pro PDF nechal 1", krok(vse, "pdf").pocet === 1);
  ok("lead z jiné stránky se nepočítá", krok(vse, "pdf").pocet === 1);
  ok("registrace jen od toho, kdo byl na kalkulačce", krok(vse, "registrace").pocet === 1);
  ok("obě větve se měří proti nabídce", krok(vse, "kliklo").zPredchoziho === 50 && krok(vse, "pdf").zPredchoziho === 50);
  ok("větve jsou odsazené", krok(vse, "kliklo").uroven === 1 && krok(vse, "pdf").uroven === 1);

  const placene = trychtyrVyzivneho(data, true);
  ok("z reklamy přišli 2", krok(placene, "prislo").pocet === 2);
  ok("PDF z vyhledávání zdarma do reklamy nepatří", krok(placene, "pdf").pocet === 0);
  ok(
    "registrace se reklamě připíše, i když už nenese označení",
    krok(placene, "registrace").pocet === 1,
  );

  const prazdno = trychtyrVyzivneho([]);
  ok("prázdná data nedělí nulou", prazdno.every((k) => Number.isFinite(k.zPredchoziho)));

  ok("gclid → cpc je placené", jePlacena(u("zobrazeni", T, "x", { utm_medium: "cpc" })));
  ok("bez označení není placené", !jePlacena(u("zobrazeni", T, "x")));
}

console.log("── vstupní stránka z reklamy ──");
{
  const T = "2026-09-27T10:00:00Z";
  const google = { cesta: CESTA_VSTUPNI, utm_source: "google", utm_medium: "cpc" };
  const fb = { cesta: CESTA_VSTUPNI, utm_source: "facebook", utm_medium: "paid_social" };
  const data = [
    // g1: Google, projde až k rodině
    u("zobrazeni", T, "g1", google),
    u("rozvrh-zadani", T, "g1", google),
    u("rozvrh-ulozit", T, "g1", google),
    u("registrace", T, "g1", { cesta: "/registrace" }),
    u("rodina", T, "g1", { cesta: "/vitejte" }),
    // f1: Facebook, naklikne a odejde
    u("zobrazeni", T, "f1", fb),
    u("rozvrh-zadani", T, "f1", fb),
    // f2: Facebook, jen se podívá
    u("zobrazeni", T, "f2", fb),
    // o1: z odkazu zdarma, s fbclid — reklama to není
    u("zobrazeni", T, "o1", { cesta: CESTA_VSTUPNI, utm_source: "facebook" }),
  ];
  const krok = (t, klic) => t.find((k) => k.klic === klic).pocet;

  const vse = trychtyrRozvrhu(data);
  ok("přišli 4", krok(vse, "prislo") === 4);
  ok("rozpis naklikali 2", krok(vse, "zadali") === 2);
  ok("rodinu založil 1", krok(vse, "rodina") === 1);

  const g = trychtyrRozvrhu(data, "google");
  ok("z Googlu přišel 1 a došel až k rodině", krok(g, "prislo") === 1 && krok(g, "rodina") === 1);

  const f = trychtyrRozvrhu(data, "facebook");
  ok("z Facebooku přišli 2", krok(f, "prislo") === 2);
  ok("rozpis z nich naklikal 1", krok(f, "zadali") === 1);
  ok("sdílený odkaz bez placeného média není reklama", !jeZFacebookAds(u("zobrazeni", T, "x", { utm_source: "facebook" })));
  ok("paid_social je placené", jePlacena(u("zobrazeni", T, "x", { utm_medium: "paid_social" })));
}

console.log(selhalo === 0 ? "\nVšechno prošlo." : `\nSelhalo: ${selhalo}`);
process.exit(selhalo === 0 ? 0 : 1);
