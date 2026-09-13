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
