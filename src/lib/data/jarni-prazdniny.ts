/**
 * Termíny jarních prázdnin podle přílohy vyhlášky č. 16/2005 Sb.,
 * o organizaci školního roku, ve znění pozdějších předpisů.
 *
 * Data jsou opsaná z právního textu, ne odhadnutá. Vyhláška v tomto znění
 * pokrývá školní roky 2022/2023 až 2027/2028 — pro pozdější roky je potřeba
 * doplnit tabulku z novely. `jarniPrazdniny()` na chybějící rok upozorní
 * tím, že vrátí null, místo aby si termín domyslela.
 *
 * Zdroj: https://www.zakonyprolidi.cz/cs/2005-16
 */

export interface JarniTermin {
  /** První den prázdnin, `YYYY-MM-DD`. */
  od: string;
  /** Poslední den prázdnin včetně. */
  do: string;
  okresy: string[];
}

export const JARNI_PRAZDNINY: Record<string, JarniTermin[]> = {
  "2022/2023": [
    { od: "2023-02-06", do: "2023-02-12", okresy: ["Praha 6 až 10", "Cheb", "Karlovy Vary", "Sokolov", "Nymburk", "Jindřichův Hradec", "Litoměřice", "Děčín", "Přerov", "Frýdek-Místek"] },
    { od: "2023-02-13", do: "2023-02-19", okresy: ["Kroměříž", "Uherské Hradiště", "Vsetín", "Zlín", "Praha-východ", "Praha-západ", "Mělník", "Rakovník", "Plzeň-město", "Plzeň-sever", "Plzeň-jih", "Hradec Králové", "Teplice", "Nový Jičín"] },
    { od: "2023-02-20", do: "2023-02-26", okresy: ["Česká Lípa", "Jablonec nad Nisou", "Liberec", "Semily", "Havlíčkův Brod", "Jihlava", "Pelhřimov", "Třebíč", "Žďár nad Sázavou", "Kladno", "Kolín", "Kutná Hora", "Písek", "Náchod", "Bruntál"] },
    { od: "2023-02-27", do: "2023-03-05", okresy: ["Mladá Boleslav", "Příbram", "Tábor", "Prachatice", "Strakonice", "Ústí nad Labem", "Chomutov", "Most", "Jičín", "Rychnov nad Kněžnou", "Olomouc", "Šumperk", "Opava", "Jeseník"] },
    { od: "2023-03-06", do: "2023-03-12", okresy: ["Benešov", "Beroun", "Rokycany", "České Budějovice", "Český Krumlov", "Klatovy", "Trutnov", "Pardubice", "Chrudim", "Svitavy", "Ústí nad Orlicí", "Ostrava-město", "Prostějov"] },
    { od: "2023-03-13", do: "2023-03-19", okresy: ["Praha 1 až 5", "Blansko", "Brno-město", "Brno-venkov", "Břeclav", "Hodonín", "Vyškov", "Znojmo", "Domažlice", "Tachov", "Louny", "Karviná"] },
  ],
  "2023/2024": [
    { od: "2024-02-05", do: "2024-02-11", okresy: ["Praha 1 až 5", "Blansko", "Brno-město", "Brno-venkov", "Břeclav", "Hodonín", "Vyškov", "Znojmo", "Domažlice", "Tachov", "Louny", "Karviná"] },
    { od: "2024-02-12", do: "2024-02-18", okresy: ["Praha 6 až 10", "Cheb", "Karlovy Vary", "Sokolov", "Nymburk", "Jindřichův Hradec", "Litoměřice", "Děčín", "Přerov", "Frýdek-Místek"] },
    { od: "2024-02-19", do: "2024-02-25", okresy: ["Kroměříž", "Uherské Hradiště", "Vsetín", "Zlín", "Praha-východ", "Praha-západ", "Mělník", "Rakovník", "Plzeň-město", "Plzeň-sever", "Plzeň-jih", "Hradec Králové", "Teplice", "Nový Jičín"] },
    { od: "2024-02-26", do: "2024-03-03", okresy: ["Česká Lípa", "Jablonec nad Nisou", "Liberec", "Semily", "Havlíčkův Brod", "Jihlava", "Pelhřimov", "Třebíč", "Žďár nad Sázavou", "Kladno", "Kolín", "Kutná Hora", "Písek", "Náchod", "Bruntál"] },
    { od: "2024-03-04", do: "2024-03-10", okresy: ["Mladá Boleslav", "Příbram", "Tábor", "Prachatice", "Strakonice", "Ústí nad Labem", "Chomutov", "Most", "Jičín", "Rychnov nad Kněžnou", "Olomouc", "Šumperk", "Opava", "Jeseník"] },
    { od: "2024-03-11", do: "2024-03-17", okresy: ["Benešov", "Beroun", "Rokycany", "České Budějovice", "Český Krumlov", "Klatovy", "Trutnov", "Pardubice", "Chrudim", "Svitavy", "Ústí nad Orlicí", "Ostrava-město", "Prostějov"] },
  ],
  "2024/2025": [
    { od: "2025-02-03", do: "2025-02-09", okresy: ["Benešov", "Beroun", "Rokycany", "České Budějovice", "Český Krumlov", "Klatovy", "Trutnov", "Pardubice", "Chrudim", "Svitavy", "Ústí nad Orlicí", "Ostrava-město", "Prostějov"] },
    { od: "2025-02-10", do: "2025-02-16", okresy: ["Praha 1 až 5", "Blansko", "Brno-město", "Brno-venkov", "Břeclav", "Hodonín", "Vyškov", "Znojmo", "Domažlice", "Tachov", "Louny", "Karviná"] },
    { od: "2025-02-17", do: "2025-02-23", okresy: ["Praha 6 až 10", "Cheb", "Karlovy Vary", "Sokolov", "Nymburk", "Jindřichův Hradec", "Litoměřice", "Děčín", "Přerov", "Frýdek-Místek"] },
    { od: "2025-02-24", do: "2025-03-02", okresy: ["Kroměříž", "Uherské Hradiště", "Vsetín", "Zlín", "Praha-východ", "Praha-západ", "Mělník", "Rakovník", "Plzeň-město", "Plzeň-sever", "Plzeň-jih", "Hradec Králové", "Teplice", "Nový Jičín"] },
    { od: "2025-03-03", do: "2025-03-09", okresy: ["Česká Lípa", "Jablonec nad Nisou", "Liberec", "Semily", "Havlíčkův Brod", "Jihlava", "Pelhřimov", "Třebíč", "Žďár nad Sázavou", "Kladno", "Kolín", "Kutná Hora", "Písek", "Náchod", "Bruntál"] },
    { od: "2025-03-10", do: "2025-03-16", okresy: ["Mladá Boleslav", "Příbram", "Tábor", "Prachatice", "Strakonice", "Ústí nad Labem", "Chomutov", "Most", "Jičín", "Rychnov nad Kněžnou", "Olomouc", "Šumperk", "Opava", "Jeseník"] },
  ],
  "2025/2026": [
    { od: "2026-02-02", do: "2026-02-08", okresy: ["Mladá Boleslav", "Příbram", "Tábor", "Prachatice", "Strakonice", "Ústí nad Labem", "Chomutov", "Most", "Jičín", "Rychnov nad Kněžnou", "Olomouc", "Šumperk", "Opava", "Jeseník"] },
    { od: "2026-02-09", do: "2026-02-15", okresy: ["Benešov", "Beroun", "Rokycany", "České Budějovice", "Český Krumlov", "Klatovy", "Trutnov", "Pardubice", "Chrudim", "Svitavy", "Ústí nad Orlicí", "Ostrava-město", "Prostějov"] },
    { od: "2026-02-16", do: "2026-02-22", okresy: ["Praha 1 až 5", "Blansko", "Brno-město", "Brno-venkov", "Břeclav", "Hodonín", "Vyškov", "Znojmo", "Domažlice", "Tachov", "Louny", "Karviná"] },
    { od: "2026-02-23", do: "2026-03-01", okresy: ["Praha 6 až 10", "Cheb", "Karlovy Vary", "Sokolov", "Nymburk", "Jindřichův Hradec", "Litoměřice", "Děčín", "Přerov", "Frýdek-Místek"] },
    { od: "2026-03-02", do: "2026-03-08", okresy: ["Kroměříž", "Uherské Hradiště", "Vsetín", "Zlín", "Praha-východ", "Praha-západ", "Mělník", "Rakovník", "Plzeň-město", "Plzeň-sever", "Plzeň-jih", "Hradec Králové", "Teplice", "Nový Jičín"] },
    { od: "2026-03-09", do: "2026-03-15", okresy: ["Česká Lípa", "Jablonec nad Nisou", "Liberec", "Semily", "Havlíčkův Brod", "Jihlava", "Pelhřimov", "Třebíč", "Žďár nad Sázavou", "Kladno", "Kolín", "Kutná Hora", "Písek", "Náchod", "Bruntál"] },
  ],
  "2026/2027": [
    { od: "2027-02-01", do: "2027-02-07", okresy: ["Česká Lípa", "Jablonec nad Nisou", "Liberec", "Semily", "Havlíčkův Brod", "Jihlava", "Pelhřimov", "Třebíč", "Žďár nad Sázavou", "Kladno", "Kolín", "Kutná Hora", "Písek", "Náchod", "Bruntál"] },
    { od: "2027-02-08", do: "2027-02-14", okresy: ["Mladá Boleslav", "Příbram", "Tábor", "Prachatice", "Strakonice", "Ústí nad Labem", "Chomutov", "Most", "Jičín", "Rychnov nad Kněžnou", "Olomouc", "Šumperk", "Opava", "Jeseník"] },
    { od: "2027-02-15", do: "2027-02-21", okresy: ["Benešov", "Beroun", "Rokycany", "České Budějovice", "Český Krumlov", "Klatovy", "Trutnov", "Pardubice", "Chrudim", "Svitavy", "Ústí nad Orlicí", "Ostrava-město", "Prostějov"] },
    { od: "2027-02-22", do: "2027-02-28", okresy: ["Praha 1 až 5", "Blansko", "Brno-město", "Brno-venkov", "Břeclav", "Hodonín", "Vyškov", "Znojmo", "Domažlice", "Tachov", "Louny", "Karviná"] },
    { od: "2027-03-01", do: "2027-03-07", okresy: ["Praha 6 až 10", "Cheb", "Karlovy Vary", "Sokolov", "Nymburk", "Jindřichův Hradec", "Litoměřice", "Děčín", "Přerov", "Frýdek-Místek"] },
    { od: "2027-03-08", do: "2027-03-14", okresy: ["Kroměříž", "Uherské Hradiště", "Vsetín", "Zlín", "Praha-východ", "Praha-západ", "Mělník", "Rakovník", "Plzeň-město", "Plzeň-sever", "Plzeň-jih", "Hradec Králové", "Teplice", "Nový Jičín"] },
  ],
  "2027/2028": [
    { od: "2028-02-07", do: "2028-02-13", okresy: ["Kroměříž", "Uherské Hradiště", "Vsetín", "Zlín", "Praha-východ", "Praha-západ", "Mělník", "Rakovník", "Plzeň-město", "Plzeň-sever", "Plzeň-jih", "Hradec Králové", "Teplice", "Nový Jičín"] },
    { od: "2028-02-14", do: "2028-02-20", okresy: ["Česká Lípa", "Jablonec nad Nisou", "Liberec", "Semily", "Havlíčkův Brod", "Jihlava", "Pelhřimov", "Třebíč", "Žďár nad Sázavou", "Kladno", "Kolín", "Kutná Hora", "Písek", "Náchod", "Bruntál"] },
    { od: "2028-02-21", do: "2028-02-27", okresy: ["Mladá Boleslav", "Příbram", "Tábor", "Prachatice", "Strakonice", "Ústí nad Labem", "Chomutov", "Most", "Jičín", "Rychnov nad Kněžnou", "Olomouc", "Šumperk", "Opava", "Jeseník"] },
    { od: "2028-02-28", do: "2028-03-05", okresy: ["Benešov", "Beroun", "Rokycany", "České Budějovice", "Český Krumlov", "Klatovy", "Trutnov", "Pardubice", "Chrudim", "Svitavy", "Ústí nad Orlicí", "Ostrava-město", "Prostějov"] },
    { od: "2028-03-06", do: "2028-03-12", okresy: ["Praha 1 až 5", "Blansko", "Brno-město", "Brno-venkov", "Břeclav", "Hodonín", "Vyškov", "Znojmo", "Domažlice", "Tachov", "Louny", "Karviná"] },
    { od: "2028-03-13", do: "2028-03-19", okresy: ["Praha 6 až 10", "Cheb", "Karlovy Vary", "Sokolov", "Nymburk", "Jindřichův Hradec", "Litoměřice", "Děčín", "Přerov", "Frýdek-Místek"] },
  ],};

/** Okresy a pražské obvody tak, jak je pojmenovává vyhláška. */
export const OKRESY: string[] = [
  "Benešov",
  "Beroun",
  "Blansko",
  "Brno-město",
  "Brno-venkov",
  "Bruntál",
  "Břeclav",
  "Cheb",
  "Chomutov",
  "Chrudim",
  "Domažlice",
  "Děčín",
  "Frýdek-Místek",
  "Havlíčkův Brod",
  "Hodonín",
  "Hradec Králové",
  "Jablonec nad Nisou",
  "Jeseník",
  "Jihlava",
  "Jindřichův Hradec",
  "Jičín",
  "Karlovy Vary",
  "Karviná",
  "Kladno",
  "Klatovy",
  "Kolín",
  "Kroměříž",
  "Kutná Hora",
  "Liberec",
  "Litoměřice",
  "Louny",
  "Mladá Boleslav",
  "Most",
  "Mělník",
  "Nový Jičín",
  "Nymburk",
  "Náchod",
  "Olomouc",
  "Opava",
  "Ostrava-město",
  "Pardubice",
  "Pelhřimov",
  "Plzeň-jih",
  "Plzeň-město",
  "Plzeň-sever",
  "Prachatice",
  "Praha 1 až 5",
  "Praha 6 až 10",
  "Praha-východ",
  "Praha-západ",
  "Prostějov",
  "Písek",
  "Přerov",
  "Příbram",
  "Rakovník",
  "Rokycany",
  "Rychnov nad Kněžnou",
  "Semily",
  "Sokolov",
  "Strakonice",
  "Svitavy",
  "Tachov",
  "Teplice",
  "Trutnov",
  "Tábor",
  "Třebíč",
  "Uherské Hradiště",
  "Vsetín",
  "Vyškov",
  "Zlín",
  "Znojmo",
  "Ústí nad Labem",
  "Ústí nad Orlicí",
  "Česká Lípa",
  "České Budějovice",
  "Český Krumlov",
  "Šumperk",
  "Žďár nad Sázavou",
];
