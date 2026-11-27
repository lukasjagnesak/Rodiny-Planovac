/**
 * Hlídač tónu zprávy — česky, v prohlížeči, bez umělé inteligence.
 *
 * Před odesláním upozorní na formulace, které druhý rodič přečte jako
 * útok: urážky, výhrůžky, obviňování, „vždycky a nikdy", křik velkými
 * písmeny, ironii. Zprávu neopravuje a neblokuje — rozhoduje rodič.
 *
 * Proč pravidla a ne jazykový model: zpráva nikam neodchází. Píše se
 * o dětech, penězích a rozvodu a posílat ji kvůli kontrole tónu cizí
 * službě by bylo horší než žádná kontrola. Pravidla jsou navíc vidět
 * a dají se vysvětlit — rodič ví, proč ho hlídač upozornil.
 *
 * Proč na tom záleží: zprávy v Klidoo nejdou smazat a končí ve výpisu
 * pro soud. Urážka napsaná ve vzteku se tam bude číst za rok.
 */

export type DruhNalezu = "urazka" | "vyhruzka" | "obvinovani" | "absolutni" | "krik" | "ironie";

export interface Nalez {
  druh: DruhNalezu;
  /** Přesně to, co ve zprávě stojí. */
  uryvek: string;
  start: number;
  konec: number;
}

export const POPIS: Record<DruhNalezu, { nazev: string; rada: string; priklad: string }> = {
  urazka: {
    nazev: "Urážka",
    rada: "Urážka zvedne napětí a ve výpisu pro soud se obrátí proti pisateli. Popište, co se stalo, ne jaký druhý je.",
    priklad: "„V pátek jsi Emu vyzvedl o hodinu později, než jsme se domluvili.“",
  },
  vyhruzka: {
    nazev: "Výhrůžka",
    rada: "Výhrůžka v písemné zprávě je důkaz proti tomu, kdo ji napsal. Když jde o vážnou věc, napište fakta a co navrhujete.",
    priklad: "„Tohle chci vyřešit. Navrhuji schůzku u mediátora.“",
  },
  obvinovani: {
    nazev: "Obviňování",
    rada: "Věty o tom, jaký druhý je, vedou k obraně, ne k domluvě. Zkuste mluvit o sobě a o dětech.",
    priklad: "„Potřebuji vědět do středy, kdo veze Tobiáše na fotbal.“",
  },
  absolutni: {
    nazev: "„Vždycky“ a „nikdy“",
    rada: "Tahle slova zní jako souhrnné obvinění a druhý se začne bránit. Pomůže konkrétní den a situace.",
    priklad: "„Minulý týden a dnes ses o předání dozvěděla až večer.“",
  },
  krik: {
    nazev: "Křik",
    rada: "Velká písmena a řada vykřičníků se čtou jako křik.",
    priklad: "„Prosím, potvrď mi to do zítřka.“",
  },
  ironie: {
    nazev: "Ironie",
    rada: "Ironie se v textu čte doslova a ostře. Napište přímo, co vám vadí.",
    priklad: "„Vadí mi, že jsem se to dozvěděl až dnes.“",
  },
};

// Hranice slova pro češtinu: \b nezná háčky, proto vlastní okolí z písmen.
const P = "(?<![\\p{L}\\p{N}])";
const K = "(?![\\p{L}\\p{N}])";

/** Urážky s povolenými koncovkami — „kráva“ ano, „kravata“ ne. */
const URAZKY = [
  "debil\\p{L}*", "idiot\\p{L}*", "kret[ée]n\\p{L}*", "blb(?:e|ec|ce|ci|ka|ko|ost|é|á|ý|ou|ě|ej)?",
  "hlupá(?:k|ku|če|ci|kem|čka|čko)", "hloup(?:á|ý|é|ej|ost)", "trotl\\p{L}*", "magor\\p{L}*",
  "kráv(?:a|o|y|ou)", "čůrák\\p{L}*", "curak\\p{L}*", "kurv\\p{L}*", "píč\\p{L}*", "pič(?:a|o|u|ovina|oviny)",
  "zmrd\\p{L}*", "sráč\\p{L}*", "hajzl\\p{L}*", "hovad\\p{L}*", "hovn\\p{L}*", "dobyt(?:ek|ku)",
  "šílen(?:á|ý|é|ec|ce|ou|ej)", "psychopat\\p{L}*", "hysterk\\p{L}*", "hysterick\\p{L}*",
  "ubožá(?:k|ku|če|ci|kem)", "uboh(?:á|ý|é|ej|ost)", "lhář\\p{L}*", "lhar(?:ka|ko|i|e)?", "lžeš", "lžete",
  "sobec(?:ká|ký|ké|kej)?", "sobc(?:i|e)", "parchant\\p{L}*", "svin(?:ě|e|i|stvo)", "mrch(?:a|o|y)",
  "šmejd\\p{L}*", "nemehl(?:o|a|e)",
];

const VYHRUZKY = [
  "uvidíš", "uvidis", "budeš litovat", "budes litovat", "pošlu (?:na tebe|ti) (?:právníka|advokáta|policii)",
  "dám tě k soudu", "dam te k soudu", "zažaluju tě", "seberu ti", "už (?:je|děti|ho|ji) neuvidíš",
  "zavolám (?:na tebe )?(?:policii|ospod|sociálku)", "to si odneseš", "zničím tě", "znicim te",
  "postarám se, abys",
];

const OBVINOVANI = [
  "ty jsi", "ty seš", "jsi úplně", "seš úplně", "kvůli tobě", "kvuli tobe", "tvoje chyba",
  "tvoje vina", "můžeš za", "je to tvoje", "ty prostě", "ty se o (?:ně|děti|ni|něj) nestaráš",
  "nezajímá tě", "je ti (?:to )?jedno",
];

/**
 * „Vždycky“ a „nikdy“ vadí jen ve větě mířené na druhého. „Vždycky
 * v pátek předáváme ve škole“ je dohoda, „ty vždycky přijdeš pozdě“
 * obvinění — proto se hlídají jen věty s druhou osobou.
 */
const ABSOLUTNI = ["vždycky", "vzdycky", "nikdy", "furt", "pořád", "jako obvykle", "jako vždy"];
const DRUHA_OSOBA =
  /(?<![\p{L}])(?:ty|tě|tebe|tobě|ti|tvoj\p{L}*|tvůj|tvá|jsi|seš)(?![\p{L}])|\p{L}{2,}(?:eš|íš|áš)(?![\p{L}])/iu;

const IRONIE = [
  "no jasně", "no jasne", "no to určitě", "no to urcite", "gratuluju", "gratuluji", "super, že",
  "díky za nic", "diky za nic", "skvělá práce", "to se ti fakt povedlo", "výborně, že", "jak jinak",
];

function regex(slova: string[]): RegExp {
  const telo = slova.map((s) => s.replace(/ /g, "\\s+")).join("|");
  return new RegExp(`${P}(?:${telo})${K}`, "giu");
}

const PRAVIDLA: { druh: DruhNalezu; re: RegExp; jenDruhaOsoba?: boolean }[] = [
  { druh: "urazka", re: regex(URAZKY) },
  { druh: "vyhruzka", re: regex(VYHRUZKY) },
  { druh: "obvinovani", re: regex(OBVINOVANI) },
  { druh: "absolutni", re: regex(ABSOLUTNI), jenDruhaOsoba: true },
  { druh: "ironie", re: regex(IRONIE) },
  // Tři a víc slov velkými písmeny za sebou, nebo jedno dlouhé (zkratky
  // jako ZŠ, ZUŠ, OSPOD se nepočítají — mají do pěti písmen).
  {
    druh: "krik",
    re: /(?<![\p{L}])(?:\p{Lu}{2,}[\s,.!?]+){2,}\p{Lu}{2,}(?![\p{L}])|(?<![\p{L}])\p{Lu}{6,}(?![\p{L}])/gu,
  },
  { druh: "krik", re: /[!?]{2,}/g },
];

/** Věta, ve které leží daná pozice (od tečky, otazníku, vykřičníku či nového řádku). */
function veta(text: string, pozice: number): string {
  const zacatek = Math.max(...[".", "!", "?", "\n"].map((z) => text.lastIndexOf(z, pozice - 1))) + 1;
  const konce = [".", "!", "?", "\n"].map((z) => text.indexOf(z, pozice)).filter((i) => i >= 0);
  return text.slice(zacatek, konce.length ? Math.min(...konce) : text.length);
}

/** Najde místa, která mohou vyznít útočně. Prázdné pole = v pořádku. */
export function zkontrolujTon(text: string): Nalez[] {
  const nalezy: Nalez[] = [];
  for (const { druh, re, jenDruhaOsoba } of PRAVIDLA) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0;
      if (jenDruhaOsoba && !DRUHA_OSOBA.test(veta(text, start))) continue;
      nalezy.push({ druh, uryvek: m[0], start, konec: start + m[0].length });
    }
  }
  // Seřadit podle místa a vyhodit překryvy (urážka uvnitř křiku apod.).
  nalezy.sort((a, b) => a.start - b.start || b.konec - a.konec);
  const bez: Nalez[] = [];
  for (const n of nalezy) {
    const posledni = bez.at(-1);
    if (posledni && n.start < posledni.konec) continue;
    bez.push(n);
  }
  return bez;
}

/** Druhy nálezů, každý jednou, v pořadí závažnosti. */
export function druhyNalezu(nalezy: Nalez[]): DruhNalezu[] {
  const poradi: DruhNalezu[] = ["vyhruzka", "urazka", "obvinovani", "absolutni", "ironie", "krik"];
  return poradi.filter((d) => nalezy.some((n) => n.druh === d));
}

/**
 * Zmírní jen to, co jde zmírnit bez změny smyslu: křik velkými písmeny
 * a řady vykřičníků. Slova za rodiče nepřepisuje — to by byla cenzura.
 */
export function ztisit(text: string): string {
  return text
    .replace(/(?<![\p{L}])(\p{Lu}{2,})(?![\p{L}])/gu, (slovo) =>
      slovo.length <= 5 ? slovo : slovo.charAt(0) + slovo.slice(1).toLowerCase(),
    )
    .replace(/(?:(?<![\p{L}])\p{Lu}{2,}[\s,.!?]+){2,}\p{Lu}{2,}(?![\p{L}])/gu, (usek) =>
      usek.charAt(0) + usek.slice(1).toLowerCase(),
    )
    .replace(/!{2,}/g, "!")
    .replace(/\?{2,}/g, "?")
    .replace(/[!?]{2,}/g, "?");
}
