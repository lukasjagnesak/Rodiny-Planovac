/**
 * Výpočty pro dashboard provozu.
 *
 * Bez databáze, aby šla čísla otestovat — špatně spočítaná konverze vede
 * k rozhodnutím o penězích a chyba v ní se sama neprojeví.
 */

export interface Udalost {
  druh: string;
  cesta: string | null;
  zdroj: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  ref: string | null;
  zarizeni: string | null;
  navstevnik: string | null;
  created_at: string;
}

export interface Den {
  den: string;
  zobrazeni: number;
  navstevnici: number;
}

export interface Radek {
  nazev: string;
  pocet: number;
  podil: number;
}

export interface KrokTrychtyre {
  klic: string;
  popisek: string;
  pocet: number;
  /** Podíl na předchozím kroku v procentech. */
  zPredchoziho: number;
  /** Podíl na prvním kroku v procentech. */
  zVrcholu: number;
  /** Odsazení při vykreslení: 1 = jedna z větví předchozího kroku. */
  uroven?: number;
}

/** Kroky v pořadí, ve kterém jimi člověk prochází. */
export const TRYCHTYR: { klic: string; popisek: string }[] = [
  { klic: "zobrazeni", popisek: "Návštěva webu" },
  { klic: "kalkulacka", popisek: "Spočítal si rozpis" },
  { klic: "registrace", popisek: "Registrace" },
  { klic: "rodina", popisek: "Založil rodinu" },
  { klic: "druhy_rodic", popisek: "Připojil druhého rodiče" },
  { klic: "predplatne", popisek: "Zaplatil" },
];

const denZ = (iso: string): string => iso.slice(0, 10);

/** Návštěvnost po dnech. Prázdné dny se doplní nulou, ať graf nelže. */
export function poDnech(udalosti: Udalost[], odDne: string, doDne: string): Den[] {
  const mapa = new Map<string, { zobrazeni: number; lide: Set<string> }>();

  for (const u of udalosti) {
    if (u.druh !== "zobrazeni") continue;
    const den = denZ(u.created_at);
    const zaznam = mapa.get(den) ?? { zobrazeni: 0, lide: new Set<string>() };
    zaznam.zobrazeni += 1;
    if (u.navstevnik) zaznam.lide.add(u.navstevnik);
    mapa.set(den, zaznam);
  }

  const vysledek: Den[] = [];
  const kurzor = new Date(`${odDne}T00:00:00Z`);
  const konec = new Date(`${doDne}T00:00:00Z`);

  while (kurzor <= konec) {
    const den = kurzor.toISOString().slice(0, 10);
    const zaznam = mapa.get(den);
    vysledek.push({
      den,
      zobrazeni: zaznam?.zobrazeni ?? 0,
      navstevnici: zaznam?.lide.size ?? 0,
    });
    kurzor.setUTCDate(kurzor.getUTCDate() + 1);
  }

  return vysledek;
}

/**
 * Žebříček podle jedné vlastnosti. Počítají se **návštěvníci**, ne
 * zobrazení — jinak by pořadí vyhrál ten, kdo nejvíc kliká.
 */
export function zebricek(
  udalosti: Udalost[],
  vyber: (u: Udalost) => string | null,
  nahrada = "přímo",
  limit = 8,
): Radek[] {
  const mapa = new Map<string, Set<string>>();

  for (const u of udalosti) {
    if (u.druh !== "zobrazeni") continue;
    const klic = (vyber(u) || nahrada).slice(0, 60);
    const lide = mapa.get(klic) ?? new Set<string>();
    lide.add(u.navstevnik ?? `anon-${u.created_at}`);
    mapa.set(klic, lide);
  }

  const celkem = [...mapa.values()].reduce((s, l) => s + l.size, 0) || 1;

  return [...mapa.entries()]
    .map(([nazev, lide]) => ({
      nazev,
      pocet: lide.size,
      podil: Math.round((lide.size / celkem) * 1000) / 10,
    }))
    .sort((a, b) => b.pocet - a.pocet)
    .slice(0, limit);
}

/**
 * Trychtýř.
 *
 * Návštěva se počítá po lidech, zbytek po událostech: registrací je tolik,
 * kolik jich vzniklo, i kdyby se jeden člověk registroval dvakrát.
 */
export function trychtyr(udalosti: Udalost[]): KrokTrychtyre[] {
  const pocty = new Map<string, number>();
  const lide = new Set<string>();

  for (const u of udalosti) {
    if (u.druh === "zobrazeni") {
      if (u.navstevnik) lide.add(u.navstevnik);
      continue;
    }
    pocty.set(u.druh, (pocty.get(u.druh) ?? 0) + 1);
  }

  const vrchol = lide.size;
  let predchozi = vrchol;

  return TRYCHTYR.map(({ klic, popisek }) => {
    const pocet = klic === "zobrazeni" ? vrchol : (pocty.get(klic) ?? 0);
    const krok: KrokTrychtyre = {
      klic,
      popisek,
      pocet,
      zPredchoziho: predchozi > 0 ? Math.round((pocet / predchozi) * 1000) / 10 : 0,
      zVrcholu: vrchol > 0 ? Math.round((pocet / vrchol) * 1000) / 10 : 0,
    };
    predchozi = pocet;
    return krok;
  });
}

/** Adresa kalkulačky výživného — vstupní stránka placené kampaně. */
export const CESTA_VYZIVNE = "/kalkulacka-vyzivneho";

/**
 * Přišla událost z placené reklamy?
 *
 * Google Ads přidává `gclid`, ze kterého `lib/atribuce.ts` udělá
 * `utm_medium=cpc`; ruční označení kampaní bývá `cpc`, `ppc` nebo `paid`.
 */
export function jePlacena(u: Udalost): boolean {
  const medium = (u.utm_medium ?? "").toLowerCase();
  return ["cpc", "ppc", "paid", "paid_social", "paidsocial"].includes(medium);
}

/** Placený proklik z Google Ads (z `gclid` nebo ručního označení). */
export function jeZGoogleAds(u: Udalost): boolean {
  return jePlacena(u) && (u.utm_source ?? "").toLowerCase() === "google";
}

/**
 * Placený proklik z Facebooku nebo Instagramu.
 *
 * Jen podle `utm_*`, které se nastaví v reklamě — `fbclid` Facebook
 * přidává ke každému odkazu, i ke sdílenému příspěvku zdarma.
 */
export function jeZFacebookAds(u: Udalost): boolean {
  const zdroj = (u.utm_source ?? "").toLowerCase();
  return jePlacena(u) && ["facebook", "fb", "instagram", "ig", "meta"].includes(zdroj);
}

/** Vstupní stránka pro placenou návštěvu z Googlu i z Facebooku. */
export const CESTA_VSTUPNI = "/vyzkouset";

export type KanalReklamy = "vse" | "google" | "facebook";

/**
 * Trychtýř vstupní stránky: přišli → naklikali rozpis → klikli na uložení
 * → zaregistrovali se → založili rodinu.
 *
 * Po lidech, ne po kliknutích, a s přiřazením registrace podle denního
 * otisku stejně jako u kalkulačky výživného (viz `trychtyrVyzivneho`).
 * Kanál se určuje po člověku: kdo kdykoli v období přišel z reklamy, patří
 * k ní i s registrací, která už označení kampaně nenese.
 */
export function trychtyrRozvrhu(udalosti: Udalost[], kanal: KanalReklamy = "vse"): KrokTrychtyre[] {
  const test = kanal === "google" ? jeZGoogleAds : kanal === "facebook" ? jeZFacebookAds : null;
  const vybrani = new Set<string>();
  if (test) for (const u of udalosti) if (u.navstevnik && test(u)) vybrani.add(u.navstevnik);
  const bere = (u: Udalost): boolean =>
    !test || (u.navstevnik !== null && vybrani.has(u.navstevnik));

  const lide = (podminka: (u: Udalost) => boolean): Set<string> => {
    const mnozina = new Set<string>();
    udalosti.forEach((u, i) => {
      if (bere(u) && podminka(u)) mnozina.add(u.navstevnik ?? `bez-otisku-${i}`);
    });
    return mnozina;
  };

  const prislo = lide((u) => u.druh === "zobrazeni" && u.cesta === CESTA_VSTUPNI);
  const zNich = (druh: string) =>
    lide((u) => u.druh === druh && u.navstevnik !== null && prislo.has(u.navstevnik));

  const kroky = [
    { klic: "prislo", popisek: "Přišli na stránku", mnozina: prislo, rodic: -1 },
    { klic: "zadali", popisek: "Naklikali si rozpis", mnozina: lide((u) => u.druh === "rozvrh-zadani"), rodic: 0 },
    { klic: "ulozit", popisek: "Klikli na Uložit do Klidoo", mnozina: lide((u) => u.druh === "rozvrh-ulozit"), rodic: 1 },
    { klic: "registrace", popisek: "Zaregistrovali se", mnozina: zNich("registrace"), rodic: 2 },
    { klic: "rodina", popisek: "Založili rodinu", mnozina: zNich("rodina"), rodic: 3 },
  ];

  const procento = (cast: number, celek: number): number =>
    celek > 0 ? Math.round((cast / celek) * 1000) / 10 : 0;

  return kroky.map(({ klic, popisek, mnozina, rodic }) => ({
    klic,
    popisek,
    pocet: mnozina.size,
    zPredchoziho: rodic < 0 ? 100 : procento(mnozina.size, kroky[rodic].mnozina.size),
    zVrcholu: procento(mnozina.size, prislo.size),
  }));
}

/**
 * Trychtýř kalkulačky výživného.
 *
 * Počítá se po lidech, ne po událostech: kdo si číslo přepočítá desetkrát,
 * je pořád jeden člověk, který kalkulačku použil. Za člověka se bere
 * denní otisk návštěvníka (viz `lib/provoz.ts`).
 *
 * Po nabídce se cesta dělí: kdo se už o děti střídá, kliká na aplikaci,
 * kdo se teprve domlouvá, nechá e-mail pro PDF. Obě větve se měří proti
 * témuž kroku — proti lidem, kteří nabídku viděli.
 *
 * Registrace se přiřadí tomu, kdo byl týž den na kalkulačce. Otisk je
 * stejný jen v rámci dne a zařízení, takže kdo se zaregistruje zítra
 * nebo z jiného telefonu, se sem nepočítá — čísla jsou spíš nižší než
 * vyšší, a to je lepší směr.
 *
 * `jenPlacene` bere lidi, u kterých se kdykoli v období objevila placená
 * návštěva — registrace přijde na jiné stránce a označení kampaně už
 * nemusí nést.
 */
export function trychtyrVyzivneho(udalosti: Udalost[], jenPlacene = false): KrokTrychtyre[] {
  const placeni = new Set<string>();
  if (jenPlacene) {
    for (const u of udalosti) if (u.navstevnik && jePlacena(u)) placeni.add(u.navstevnik);
  }
  const bere = (u: Udalost): boolean =>
    !jenPlacene || (u.navstevnik !== null && placeni.has(u.navstevnik));

  const lide = (podminka: (u: Udalost) => boolean): Set<string> => {
    const mnozina = new Set<string>();
    udalosti.forEach((u, i) => {
      // Bez otisku (třeba když se nepovedl hash) je každá událost
      // samostatný člověk. Nadsadí to jen tenhle vzácný případ.
      if (bere(u) && podminka(u)) mnozina.add(u.navstevnik ?? `bez-otisku-${i}`);
    });
    return mnozina;
  };

  const prislo = lide((u) => u.druh === "zobrazeni" && u.cesta === CESTA_VYZIVNE);
  const kroky: { klic: string; popisek: string; mnozina: Set<string>; rodic: number; uroven?: number }[] = [
    { klic: "prislo", popisek: "Přišli na kalkulačku", mnozina: prislo, rodic: -1 },
    {
      klic: "zadalo",
      popisek: "Začali vyplňovat",
      mnozina: lide((u) => u.druh === "vyzivne-zadani"),
      rodic: 0,
    },
    {
      klic: "videlo",
      popisek: "Došli k nabídce pod výsledkem",
      mnozina: lide((u) => u.druh === "vyzivne-nabidka-videt"),
      rodic: 1,
    },
    {
      klic: "kliklo",
      popisek: "Klikli na Vyzkoušet zdarma pod výsledkem",
      mnozina: lide((u) => u.druh === "vyzivne-prenos"),
      rodic: 2,
      uroven: 1,
    },
    {
      klic: "pdf",
      popisek: "Nechali e-mail pro PDF",
      mnozina: lide((u) => u.druh === "lead" && u.cesta === CESTA_VYZIVNE),
      rodic: 2,
      uroven: 1,
    },
    {
      // Pruh nad kalkulačkou a nabídka na konci stránky. Vedou na holou
      // registraci bez výpočtu, a tak se měří zvlášť — a proti všem,
      // kdo přišli, protože pruh je vidět dřív než cokoli jiného.
      klic: "jinde",
      popisek: "Klikli na Vyzkoušet jinde na stránce",
      mnozina: lide((u) => u.druh === "vyzivne-pruh" || u.druh === "vyzivne-konec"),
      rodic: 0,
    },
    {
      klic: "registrace",
      popisek: "Zaregistrovali se (z těch, co přišli)",
      mnozina: lide(
        (u) => u.druh === "registrace" && u.navstevnik !== null && prislo.has(u.navstevnik),
      ),
      rodic: 0,
    },
  ];

  const procento = (cast: number, celek: number): number =>
    celek > 0 ? Math.round((cast / celek) * 1000) / 10 : 0;
  const vrchol = prislo.size;

  return kroky.map(({ klic, popisek, mnozina, rodic, uroven }) => ({
    klic,
    popisek,
    pocet: mnozina.size,
    zPredchoziho: rodic < 0 ? 100 : procento(mnozina.size, kroky[rodic].mnozina.size),
    zVrcholu: procento(mnozina.size, vrchol),
    ...(uroven ? { uroven } : {}),
  }));
}

/** Kanál návštěvníka: utm_source, partnerský kód, jinak doména odkazu. */
export function kanal(u: Udalost): string | null {
  if (u.ref) return `partner: ${u.ref}`;
  if (u.utm_source) return u.utm_medium ? `${u.utm_source} / ${u.utm_medium}` : u.utm_source;
  return u.zdroj;
}


export interface Hodina {
  /** Začátek hodiny v místním čase, „14:00". */
  popisek: string;
  /** Kolikátá hodina zpětně: 0 = probíhající, 23 = nejstarší. */
  zpet: number;
  zobrazeni: number;
  navstevnici: number;
}

/**
 * Rozpad posledních 24 hodin po hodinách.
 *
 * Denní graf je na krátké okno slepý: kampaň spuštěná v poledne, výpadek
 * v noci nebo příspěvek, který se chytil, vypadají v denním sloupci
 * stejně. Tohle je jediné místo, kde je vidět, co se stalo dnes — a při
 * zapnuté reklamě je to ta informace, kvůli které se do přehledu chodí.
 *
 * Počítá se v místním čase, ne v UTC. Rozdíl je v Česku hodina nebo dvě
 * a „v kolik chodí lidi" je otázka na jejich hodinky, ne na servery.
 *
 * Hodiny bez návštěvy zůstávají v řadě jako nuly. Vynechat je by ze
 * tříhodinové pauzy udělalo souvislou čáru a noc by vypadala jako den.
 */
export function poHodinach(udalosti: Udalost[], ted = new Date()): Hodina[] {
  // Začátek probíhající hodiny — od něj se počítá 24 kroků zpátky.
  const zacatek = new Date(ted);
  zacatek.setMinutes(0, 0, 0);

  const mapa = new Map<number, { zobrazeni: number; lide: Set<string> }>();

  for (const u of udalosti) {
    if (u.druh !== "zobrazeni") continue;
    const kdy = new Date(u.created_at);
    if (Number.isNaN(kdy.getTime())) continue;

    // Kolik hodin zpátky událost patří. Cokoli od začátku probíhající
    // hodiny dál je koš 0; starší se zaokrouhlí nahoru, protože událost
    // deset minut před celou patří do hodiny předchozí, ne do téhle.
    const rozdil = zacatek.getTime() - kdy.getTime();
    const kos = rozdil <= 0 ? 0 : Math.ceil(rozdil / (60 * 60 * 1000));
    if (kos > 23) continue;

    const zaznam = mapa.get(kos) ?? { zobrazeni: 0, lide: new Set<string>() };
    zaznam.zobrazeni += 1;
    if (u.navstevnik) zaznam.lide.add(u.navstevnik);
    mapa.set(kos, zaznam);
  }

  const vysledek: Hodina[] = [];
  for (let zpet = 23; zpet >= 0; zpet -= 1) {
    const kdy = new Date(zacatek.getTime() - zpet * 60 * 60 * 1000);
    const zaznam = mapa.get(zpet);
    vysledek.push({
      popisek: `${String(kdy.getHours()).padStart(2, "0")}:00`,
      zpet,
      zobrazeni: zaznam?.zobrazeni ?? 0,
      navstevnici: zaznam?.lide.size ?? 0,
    });
  }

  return vysledek;
}
