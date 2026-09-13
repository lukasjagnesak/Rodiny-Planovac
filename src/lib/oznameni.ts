import { differenceInCalendarDays } from "date-fns";
import { toDateKey, fromDateKey } from "./dates";
import type {
  ActivityOccurrence,
  Activity,
  Child,
  FamilyEvent,
  RozvrhZmena,
} from "./types";

/**
 * Oznámení se nikam neukládají — skládají se z toho, co už v databázi je.
 * Vlastní tabulka by znamenala druhou pravdu a otázku, co s oznámením,
 * když se originál smaže.
 */
export type OznameniDruh = "zprava" | "ukol" | "udalost" | "doprava" | "rozvrh";

export interface Oznameni {
  id: string;
  druh: OznameniDruh;
  /** Podle čeho se řadí a co se porovnává s „viděno do". */
  kdy: string;
  titulek: string;
  popis: string | null;
  odkaz: string;
  childId: string | null;
}

export interface ZdrojeOznameni {
  edupage: {
    id: string;
    druh: string;
    text: string;
    predmet: string | null;
    termin: string | null;
    zadano: string | null;
    hotovo: boolean;
    autor: string | null;
    child_id: string | null;
  }[];
  udalosti: FamilyEvent[];
  zmeny: RozvrhZmena[];
  jizdy: (ActivityOccurrence & { activity?: Activity | null })[];
  deti: Child[];
  /** Kvůli tomu, aby se doprava hlásila jen tomu, kdo veze. */
  userId: string;
}

const DEN = 24 * 60 * 60 * 1000;

/** Termín jako čas, ať se dá řadit společně se zprávami. */
function denJakoCas(den: string): string {
  return new Date(`${den}T07:00:00`).toISOString();
}

/**
 * Poskládá seznam toho, co by měl rodič vidět hned po přihlášení.
 *
 * Bere se jen to, co ještě někoho čeká — hotové úkoly a proběhlé
 * události nemají v upozorněních co dělat.
 */
export function slozOznameni(zdroje: ZdrojeOznameni, dnes = new Date()): Oznameni[] {
  const dnesKlic = toDateKey(dnes);
  const vysledek: Oznameni[] = [];

  for (const item of zdroje.edupage) {
    if (item.druh === "zprava") {
      vysledek.push({
        id: `zprava:${item.id}`,
        druh: "zprava",
        kdy: item.zadano ?? new Date(dnes).toISOString(),
        titulek: item.text.slice(0, 140) || "Zpráva ze školy",
        popis: item.autor,
        odkaz: "/ukoly",
        childId: item.child_id,
      });
      continue;
    }

    // Úkoly a písemky se hlásí, dokud nejsou hotové a termín neuplynul.
    if (item.hotovo || !item.termin || item.termin < dnesKlic) continue;

    const zbyva = differenceInCalendarDays(fromDateKey(item.termin), dnes);
    if (zbyva > 7) continue;

    vysledek.push({
      id: `ukol:${item.id}`,
      druh: "ukol",
      kdy: denJakoCas(item.termin),
      titulek: item.text.slice(0, 140) || "Úkol",
      popis: item.predmet,
      odkaz: "/ukoly",
      childId: item.child_id,
    });
  }

  for (const udalost of zdroje.udalosti) {
    const zacatek = new Date(udalost.starts_at);
    if (zacatek.getTime() < dnes.getTime() - DEN) continue;
    if (zacatek.getTime() > dnes.getTime() + 14 * DEN) continue;

    vysledek.push({
      id: `udalost:${udalost.id}`,
      druh: "udalost",
      kdy: udalost.starts_at,
      titulek: udalost.title,
      popis: udalost.location,
      odkaz: "/udalosti",
      childId: udalost.child_id,
    });
  }

  for (const zmena of zdroje.zmeny) {
    if (zmena.den < dnesKlic) continue;
    vysledek.push({
      id: `rozvrh:${zmena.id}`,
      druh: "rozvrh",
      kdy: denJakoCas(zmena.den),
      titulek:
        zmena.druh === "zruseno"
          ? `Odpadá ${zmena.poradi}. hodina${zmena.predmet ? ` — ${zmena.predmet}` : ""}`
          : `Změna v rozvrhu${zmena.predmet ? ` — ${zmena.predmet}` : ""}`,
      popis: null,
      odkaz: "/rozvrh",
      childId: zmena.child_id,
    });
  }

  for (const jizda of zdroje.jizdy) {
    if (jizda.cancelled || jizda.day < dnesKlic) continue;

    const vezuTam = jizda.driver_there === zdroje.userId;
    const vezuZpet = jizda.driver_back === zdroje.userId;
    if (!vezuTam && !vezuZpet) continue;

    const smer = vezuTam && vezuZpet ? "tam i zpět" : vezuTam ? "tam" : "zpět";
    vysledek.push({
      id: `doprava:${jizda.id}`,
      druh: "doprava",
      kdy: denJakoCas(jizda.day),
      titulek: `Vezeš ${smer}${jizda.activity ? ` — ${jizda.activity.name}` : ""}`,
      popis: jizda.activity?.location ?? null,
      odkaz: "/krouzky",
      childId: jizda.activity?.child_id ?? null,
    });
  }

  // Nejbližší nahoře. U zpráv to znamená nejnovější, u termínů nejdřívější.
  return vysledek.sort((a, b) => {
    if (a.druh === "zprava" && b.druh === "zprava") return b.kdy.localeCompare(a.kdy);
    return a.kdy.localeCompare(b.kdy);
  });
}

/** Kolik z nich je novějších než poslední návštěva. */
export function pocetNovych(oznameni: Oznameni[], videnoDo: string | null): number {
  if (!videnoDo) return oznameni.length;
  return oznameni.filter((o) => o.kdy > videnoDo).length;
}
