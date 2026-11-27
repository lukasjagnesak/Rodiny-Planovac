/**
 * Čtení výdajů z tabulky.
 *
 * Tady se data tiše rozbijí, když se to udělá špatně: český Excel
 * odděluje středníkem, píše desetinnou čárku a datum jako 15.3.2026.
 * Špatně přečtená částka nikde nespadne, jen bude v přehledu nesmysl.
 *
 * Spouští se přes `npm run test:import`.
 */
const {
  prectiCastku,
  prectiDatum,
  urciOddelovac,
  rozsekejRadek,
  odhadniSloupce,
  odhadniKategorii,
  prectiCsv,
} = require("../.test-build/import-vydaju.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

console.log("── částky ──");
ok("prosté číslo", prectiCastku("250") === 250);
ok("desetinná čárka", prectiCastku("1234,50") === 1234.5);
ok("desetinná tečka", prectiCastku("1234.50") === 1234.5);
ok("mezera jako tisíce", prectiCastku("1 234,50") === 1234.5);
ok("nezlomitelná mezera", prectiCastku("1 234,50") === 1234.5);
ok("s měnou", prectiCastku("1 890 Kč") === 1890);
ok("tečka jako tisíce, čárka desetinná", prectiCastku("1.234,50") === 1234.5);
ok("čárka jako tisíce", prectiCastku("1,234") === 1234);
ok("záporná částka", prectiCastku("-250") === -250);
ok("prázdno je null", prectiCastku("") === null);
ok("text bez čísla je null", prectiCastku("nevím") === null);

console.log("── data ──");
ok("ISO", prectiDatum("2026-03-15") === "2026-03-15");
ok("české s tečkami", prectiDatum("15.3.2026") === "2026-03-15");
ok("české s mezerami", prectiDatum("15. 3. 2026") === "2026-03-15");
ok("lomítka", prectiDatum("15/03/2026") === "2026-03-15");
ok("dvouciferný rok", prectiDatum("15.3.26") === "2026-03-15");
ok("neexistující den je null", prectiDatum("31.2.2026") === null);
ok("nesmyslný měsíc je null", prectiDatum("15.13.2026") === null);
ok("prázdno je null", prectiDatum("") === null);

console.log("── řádky ──");
ok("středník", urciOddelovac("datum;popis;částka") === ";");
ok("čárka", urciOddelovac("datum,popis,castka") === ",");
ok("tabulátor", urciOddelovac("datum\tpopis\tcastka") === "\t");
ok(
  "uvozovky drží oddělovač uvnitř",
  JSON.stringify(rozsekejRadek('a;"b;c";d', ";")) === JSON.stringify(["a", "b;c", "d"]),
);
ok(
  "zdvojené uvozovky",
  JSON.stringify(rozsekejRadek('a;"říká ""ahoj""";c', ";")) ===
    JSON.stringify(["a", 'říká "ahoj"', "c"]),
);

console.log("── sloupce a kategorie ──");
let s = odhadniSloupce(["Datum", "Popis", "Částka", "Kategorie"]);
ok("najde datum", s.datum === 0);
ok("najde částku", s.castka === 2);
s = odhadniSloupce(["Den nákupu", "Co", "Cena v Kč"]);
ok("najde i podle části názvu", s.datum === 0 && s.popis === 1 && s.castka === 2);
ok("chybějící sloupec je -1", odhadniSloupce(["a", "b"]).castka === -1);

ok("pozná výživné", odhadniKategorii("Výživné za březen") === "alimony");
ok("pozná oblečení", odhadniKategorii("zimní bunda") === "clothing");
ok("pozná školu", odhadniKategorii("družina") === "school");
ok("nic nepozná → null", odhadniKategorii("xyz") === null);

console.log("── celý soubor ──");
const CSV = [
  "Datum;Popis;Částka;Kategorie",
  "15.3.2026;Zimní bunda;1 890 Kč;oblečení",
  "1.4.2026;Výživné duben;8000;",
  "2.4.2026;;250;",
  "3.4.2026;Bez částky;;",
].join("\n");

const v = prectiCsv(CSV);
ok("oddělovač je středník", v.oddelovac === ";");
ok("přečte všechny řádky", v.radky.length === 4);
ok("částka s měnou i mezerou", v.radky[0].castka === 1890);
ok("datum převedeno", v.radky[0].datum === "2026-03-15");
ok("kategorie odhadnuta", v.radky[0].kategorie === "clothing");
ok("výživné rozpoznáno", v.radky[1].kategorie === "alimony");
ok("chybějící popis se hlásí", v.radky[2].chyba !== null);
ok("chybějící částka se hlásí", v.radky[3].chyba !== null);
ok("dobrý řádek chybu nemá", v.radky[0].chyba === null);
ok("číslo řádku sedí na soubor", v.radky[0].cislo === 2);

// BOM z Excelu nesmí ulpět na prvním názvu sloupce.
const sBom = prectiCsv("﻿Datum;Popis;Částka\n1.1.2026;Test;10");
ok("BOM se odstraní", sBom.radky[0].castka === 10 && sBom.radky[0].datum === "2026-01-01");

console.log(selhalo === 0 ? "\n=== VŠE PROŠLO ===" : `\n=== ${selhalo} SELHALO ===`);
process.exit(selhalo === 0 ? 0 : 1);
