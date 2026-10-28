/**
 * Ukázková rodina pro snímky aplikace na webu.
 *
 * Jména jsou smyšlená a nesmí patřit nikomu skutečnému — žádné jméno
 * zakladatele, jeho dětí ani klientů. Snímky jsou veřejné a vyhledávač
 * je zaindexuje.
 *
 * Data mají působit jako běžný měsíc běžné rodiny: dvě děti, střídání
 * po týdnu, pár kroužků, obyčejné výdaje a klidné zprávy. Žádné hádky
 * v ukázce — rodič, který se právě rozvádí, nechce vidět konflikt,
 * chce vidět, že to jde v klidu.
 *
 * Používá ji jen `app/nahled-mobil/[obrazovka]` (vývoj) a skript
 * `scripts/snimky-aplikace.mjs`, který z ní dělá obrázky do `public/ukazky`.
 */
import { addDays, format, startOfWeek } from "date-fns";
import type {
  Activity,
  ActivityOccurrence,
  CustodyPattern,
  Expense,
  FamilyEvent,
  OpakovanyVydaj,
  RozvrhHodina,
  SessionContext,
  ZadostZmeny,
  ZaznamHistorie,
} from "./types";
import type { Zprava } from "./zpravy";

const klic = (d: Date) => format(d, "yyyy-MM-dd");

export function ukazkovaRodina(dnes: Date = new Date()) {
  const den = (posun: number) => klic(addDays(dnes, posun));
  const pondeli = startOfWeek(dnes, { weekStartsOn: 1 });
  const vTydnu = (dow: number, posunTydnu = 0) => klic(addDays(pondeli, dow - 1 + posunTydnu * 7));
  const cas = (d: string, h: string) => `${d}T${h}:00`;

  const TATA = "u-tata";
  const MAMA = "u-mama";

  const session = {
    userId: TATA,
    profile: {
      id: TATA,
      full_name: "Petr Dvořák",
      email: "petr@example.cz",
      avatar_url: null,
      phone: null,
      color: "#2563eb",
      locale: "cs",
      prehled_karty: null,
    },
    family: {
      id: "f-ukazka",
      name: "Ema a Tobiáš",
      currency: "CZK",
      timezone: "Europe/Prague",
      created_by: TATA,
      created_at: den(-200),
    },
    members: [
      { id: "m1", userId: TATA, name: "Petr", email: null, role: "owner", side: "a", color: "#2563eb", avatarUrl: null },
      { id: "m2", userId: MAMA, name: "Jana", email: null, role: "parent", side: "b", color: "#db2777", avatarUrl: null },
    ],
    children: [
      { id: "c-ema", family_id: "f-ukazka", name: "Ema", birth_date: "2016-05-14", color: "#0ea5e9", avatar_url: null, school: "ZŠ Na Výsluní", class_name: "4.A", okres: "CZ0100", notes: null, archived: false },
      { id: "c-tobias", family_id: "f-ukazka", name: "Tobiáš", birth_date: "2019-02-03", color: "#f59e0b", avatar_url: null, school: "ZŠ Na Výsluní", class_name: "1.B", okres: "CZ0100", notes: null, archived: false },
    ],
    myMembership: { id: "m1", family_id: "f-ukazka", user_id: TATA, role: "owner", custody_side: "a", display_name: null, color: null, created_at: den(-200) },
    allFamilies: [{ id: "f-ukazka", name: "Ema a Tobiáš" }],
  } as unknown as SessionContext;

  const patterns: CustodyPattern[] = [
    {
      id: "p1", family_id: "f-ukazka", child_id: null, kind: "alternating_weeks",
      starts_on: den(-200), ends_on: null, anchor_date: klic(pondeli), anchor_side: "a",
      weekly_map: null, fixed_side: null, handover_dow: 5, handover_time: "17:00",
      note: null, predavka_vecer: true,
    },
  ];

  const activities: Activity[] = [
    { id: "a-plavani", family_id: "f-ukazka", child_id: "c-ema", name: "Plavání", location: "Plavecký stadion", address: null, day_of_week: 2, starts_at: "16:00", ends_at: "17:00", season_start: den(-60), season_end: null, price: 3200, price_period: "pololeti", paid_by: TATA, split_percent: 50, contact: null, color: "#0ea5e9", notes: null, active: true },
    { id: "a-fotbal", family_id: "f-ukazka", child_id: "c-tobias", name: "Fotbal přípravka", location: "Hřiště Bohemians", address: null, day_of_week: 4, starts_at: "16:30", ends_at: "17:30", season_start: den(-60), season_end: null, price: 2800, price_period: "pololeti", paid_by: MAMA, split_percent: 50, contact: null, color: "#16a34a", notes: null, active: true },
    { id: "a-klavir", family_id: "f-ukazka", child_id: "c-ema", name: "Klavír", location: "ZUŠ", address: null, day_of_week: 3, starts_at: "15:00", ends_at: "15:45", season_start: den(-60), season_end: null, price: 2400, price_period: "pololeti", paid_by: MAMA, split_percent: 50, contact: null, color: "#7c3aed", notes: null, active: true },
  ];

  const occurrences: ActivityOccurrence[] = [
    { id: "o1", family_id: "f-ukazka", activity_id: "a-plavani", day: vTydnu(2), cancelled: false, starts_at: null, ends_at: null, driver_there: TATA, driver_back: TATA, note: null },
    { id: "o2", family_id: "f-ukazka", activity_id: "a-klavir", day: vTydnu(3), cancelled: false, starts_at: null, ends_at: null, driver_there: MAMA, driver_back: TATA, note: null },
    { id: "o3", family_id: "f-ukazka", activity_id: "a-fotbal", day: vTydnu(4), cancelled: false, starts_at: null, ends_at: null, driver_there: TATA, driver_back: MAMA, note: null },
  ];

  const events: FamilyEvent[] = [
    { id: "e1", family_id: "f-ukazka", child_id: "c-ema", kind: "parent_meeting", title: "Třídní schůzky", location: "ZŠ Na Výsluní", starts_at: cas(den(3), "17:00"), ends_at: null, all_day: false, notes: null, responsible: TATA, reminders: [], created_by: TATA },
    { id: "e2", family_id: "f-ukazka", child_id: "c-tobias", kind: "medical", title: "Preventivní prohlídka", location: "Pediatrie", starts_at: cas(den(8), "09:30"), ends_at: null, all_day: false, notes: null, responsible: MAMA, reminders: [], created_by: MAMA },
    { id: "e3", family_id: "f-ukazka", child_id: "c-ema", kind: "birthday", title: "Oslava u kamarádky", location: null, starts_at: cas(den(12), "15:00"), ends_at: null, all_day: false, notes: null, responsible: null, reminders: [], created_by: MAMA },
  ];

  const vydaj = (id: string, posun: number, title: string, amount: number, category: Expense["category"], paid_by: string, child_id: string | null, settled = false): Expense => ({
    id, family_id: "f-ukazka", child_id, category, title, amount, currency: "CZK", spent_on: den(posun),
    paid_by, split_percent: 50, settled, activity_id: null, event_id: null, note: null, created_at: den(posun), receipts: [],
  });

  const expenses: Expense[] = [
    vydaj("x1", -1, "Obědy ve školní jídelně", 1180, "school", TATA, "c-ema"),
    {
      ...vydaj("x2", -4, "Zimní bunda", 1890, "clothing", MAMA, "c-tobias"),
      // Žádost o proplacení, ať je v ukázce vidět, jak se schvaluje.
      zadosti_proplaceni: [
        { id: "zp1", family_id: "f-ukazka", expense_id: "x2", pozadal: MAMA, pozadal_jmeno: "Jana", castka: 945, poznamka: "Účtenka je v příloze.", stav: "ceka", odpovedel: null, odpovedel_jmeno: null, duvod: null, odpovezeno_at: null, zaplaceno_at: null, created_at: den(-3), ucet: "CZ6508000000192000145399" },
      ],
    },
    vydaj("x3", -6, "Plavání — pololetí", 3200, "activities", TATA, "c-ema"),
    {
      ...vydaj("x4", -9, "Kopačky", 990, "activities", MAMA, "c-tobias"),
      zadosti_proplaceni: [
        { id: "zp2", family_id: "f-ukazka", expense_id: "x4", pozadal: MAMA, pozadal_jmeno: "Jana", castka: 495, poznamka: null, stav: "schvaleno", odpovedel: TATA, odpovedel_jmeno: "Petr", duvod: null, odpovezeno_at: den(-7), zaplaceno_at: null, created_at: den(-8), ucet: "CZ6508000000192000145399" },
      ],
    },
    vydaj("x5", -12, "Vitamíny a sirup", 420, "health", TATA, null),
    // Starší měsíce, ať graf vývoje není jeden sloupec.
    vydaj("x6", -35, "Školní pomůcky", 2350, "school", MAMA, "c-tobias", true),
    vydaj("x7", -40, "Obědy ve školní jídelně", 1180, "school", TATA, "c-ema", true),
    vydaj("x8", -66, "Letní tábor", 4900, "activities", MAMA, "c-ema", true),
    vydaj("x9", -95, "Sandály a plavky", 1320, "clothing", TATA, "c-tobias", true),
    vydaj("x10", -128, "Zubař", 800, "health", MAMA, "c-ema", true),
    vydaj("x11", -150, "Obědy ve školní jídelně", 1180, "school", TATA, "c-ema", true),
  ];

  const opakovane: OpakovanyVydaj[] = [];

  const PREDMETY = ["Český jazyk", "Matematika", "Anglický jazyk", "Prvouka", "Tělesná výchova"];
  const rozvrh: RozvrhHodina[] = [1, 2, 3, 4, 5].flatMap((d) =>
    PREDMETY.map((predmet, i) => ({
      id: `r-${d}-${i}`, family_id: "f-ukazka", child_id: "c-ema", den: d, poradi: i + 1,
      predmet: PREDMETY[(i + d) % PREDMETY.length], ucebna: "4.A", ucitel: null,
      zacatek: `${String(8 + i).padStart(2, "0")}:00`, konec: `${String(8 + i).padStart(2, "0")}:45`,
      parita: "vzdy", poznamka: null, ze_edupage: true,
    })),
  );

  const zprava = (id: string, autor: string, jmeno: string, posunDni: number, hod: string, text: string, precteno = true): Zprava => ({
    id, autor, autor_jmeno: jmeno, text, den: null, child_id: null, expense_id: null, event_id: null,
    created_at: new Date(`${den(posunDni)}T${hod}:00`).toISOString(),
    precteni: precteno ? [{ user_id: autor === TATA ? MAMA : TATA, precteno_at: new Date(`${den(posunDni)}T${hod}:30`).toISOString() }] : [],
  });

  const zpravy: Zprava[] = [
    zprava("z1", MAMA, "Jana", -2, "18:12", "Ahoj, v pátek můžu Tobiáše vyzvednout až v 17:30, mám poradu. Můžeme předávku posunout?"),
    zprava("z2", TATA, "Petr", -2, "18:40", "Jasně, 17:30 u školy je v pohodě. Emu vezmu rovnou z plavání."),
    zprava("z3", MAMA, "Jana", -1, "07:55", "Díky. Ema potřebuje na čtvrtek přezůvky do tělocviku, ty staré jsou malé."),
    zprava("z4", TATA, "Petr", -1, "12:20", "Koupím je dnes, účtenku dám do výdajů."),
  ];

  // Jana navrhuje prohození víkendů — žádost čeká na Petra.
  const zadosti: ZadostZmeny[] = [
    {
      id: "zz1", family_id: "f-ukazka", child_id: null,
      od: vTydnu(5, 2), do_dne: vTydnu(7, 2), strana: "b",
      vymena_od: vTydnu(5, 3), vymena_do: vTydnu(7, 3),
      duvod: "Jedeme s dětmi k babičce na její narozeniny",
      navrhl: MAMA, navrhl_jmeno: "Jana", odpovedet_do: vTydnu(5, 1),
      stav: "ceka", odpovedel: null, odpoved: null, vyrizeno_at: null, created_at: den(-1),
    },
  ];

  const zaznam = (id: number, posun: number, hod: string, kdo: string, oblast: ZaznamHistorie["oblast"], popis: string): ZaznamHistorie => ({
    id, family_id: "f-ukazka", kdo: kdo === "Petr" ? TATA : MAMA, kdo_jmeno: kdo,
    kdy: new Date(`${den(posun)}T${hod}:00`).toISOString(), oblast, popis, zaznam_id: null,
  });
  const historie: ZaznamHistorie[] = [
    zaznam(8, 0, "12:20", "Petr", "vydaje", "Výdaj: Obědy ve školní jídelně, 1 180 Kč"),
    zaznam(7, -1, "08:02", "Jana", "vydaje", "Výdaj Kopačky označen jako vyrovnaný"),
    zaznam(6, -2, "18:45", "Petr", "rozvrh", "Výjimka v rozvrhu: 7. 11. 2026 u: Jana"),
    zaznam(5, -2, "18:45", "Petr", "rozvrh", "Výjimka v rozvrhu: 14. 11. 2026 u: Petr"),
    zaznam(4, -4, "20:10", "Jana", "vydaje", "Upraven výdaj: Zimní bunda, 1 690 Kč → 1 890 Kč"),
    zaznam(3, -5, "17:30", "Petr", "vypisy", "Stažen výpis komunikace (kód K7F3-9QX2)"),
    zaznam(2, -9, "09:12", "Jana", "udalosti", "Událost: Preventivní prohlídka"),
    zaznam(1, -12, "19:00", "Petr", "krouzky", "Upraven kroužek: Plavání"),
  ];

  return { session, zadosti, historie, patterns, activities, occurrences, events, expenses, opakovane, rozvrh, zpravy, pondeli: klic(pondeli) };
}
