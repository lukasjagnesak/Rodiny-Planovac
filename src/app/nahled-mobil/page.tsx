import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard/dashboard";

/**
 * Přehled s vymyšlenými daty — jen pro vývoj a pro test rozvržení.
 *
 * Vzniklo to z konkrétní chyby: na mobilu byla aplikace širší než
 * displej a prohlížeč ji zmenšil, takže celý přehled vypadal
 * „roztaženě". V kódu nebylo co poznat — mřížka bez určeného počtu
 * sloupců si udělá sloupec šířky `auto` a ten se roztáhne na nejširší
 * obsah, kterým bylo dlouhé jméno rodiče v `truncate`.
 *
 * Takovou věc neodhalí typová kontrola ani jednotkový test, jen
 * opravdový prohlížeč v opravdové šířce. Aby to šlo změřit, musí být
 * přehled dosažitelný bez přihlášení a bez databáze — od toho je tahle
 * stránka. Měří ji `tests/mobil.browser.test.js`.
 *
 * Kreslí se i s obalem aplikace, ne jen samotný přehled. Navigace je
 * druhé místo, kde se chyby poznají až na telefonu: spodní lišta pojme
 * čtyři položky a zbytek je pod „Víc", takže položka, která vypadne
 * z obou seznamů, prostě zmizí. Přesně to se stalo Událostem.
 *
 * V ostrém provozu neexistuje: `notFound()` níž. Data jsou smyšlená,
 * ale schválně nepohodlná — dlouhá jména, dlouhé názvy výdajů a
 * událostí. Ukázka se samými „Eva" a „Oběd" by problém neukázala.
 */

const dnes = new Date();
const den = (o: number) =>
  new Date(dnes.getFullYear(), dnes.getMonth(), dnes.getDate() + o).toISOString().slice(0, 10);

// Data pro vykreslení, ne pro typovou kontrolu — proto `any`. Skutečné
// tvary hlídá `lib/types.ts` tam, kde se čtou z databáze.
/* eslint-disable @typescript-eslint/no-explicit-any */

const session: any = {
  userId: "u1",
  profile: {
    id: "u1",
    full_name: "Lukáš Jagnešák",
    email: "lukas@example.cz",
    avatar_url: null,
    phone: null,
    color: "#2563eb",
    locale: "cs",
    prehled_karty: null,
  },
  family: {
    id: "f1",
    name: "Rodina",
    currency: "CZK",
    timezone: "Europe/Prague",
    created_by: "u1",
    created_at: den(-400),
  },
  members: [
    { id: "m1", userId: "u1", name: "Lukáš Jagnešák", email: null, role: "owner", side: "a", color: "#2563eb", avatarUrl: null },
    { id: "m2", userId: "u2", name: "Kateřina Nováková", email: null, role: "parent", side: "b", color: "#db2777", avatarUrl: null },
  ],
  children: [
    { id: "c1", family_id: "f1", name: "Eliška Jagnešáková", birth_date: "2015-04-02", color: "#0ea5e9", avatar_url: null, school: "ZŠ Komenského", class_name: "3.B", okres: "CZ0100", notes: null, archived: false },
    { id: "c2", family_id: "f1", name: "Matyáš Jagnešák", birth_date: "2012-09-11", color: "#f59e0b", avatar_url: null, school: "ZŠ Komenského", class_name: "6.A", okres: "CZ0100", notes: null, archived: false },
  ],
  myMembership: { id: "m1", family_id: "f1", user_id: "u1", role: "owner", custody_side: "a", display_name: null, color: null, created_at: den(-400) },
  allFamilies: [{ id: "f1", name: "Rodina" }],
};

const patterns: any = [
  {
    id: "p1", family_id: "f1", child_id: null, kind: "alternating_weeks", starts_on: den(-300),
    ends_on: null, anchor_date: den(-300), anchor_side: "a", weekly_map: null, fixed_side: null,
    handover_dow: 0, handover_time: "18:00", note: null,
  },
];

const activities: any = [
  { id: "a1", family_id: "f1", child_id: "c1", name: "Sportovní gymnastika pro mladší žákyně", place: "Sokolovna Vršovice", dow: (dnes.getDay() + 1) % 7, start_time: "16:00", end_time: "17:30", starts_on: den(-100), ends_on: null, driver_to: "m1", driver_back: "m2", price: 3200, price_period: "pololeti", split_a: 50, note: null, archived: false, color: "#16a34a" },
  { id: "a2", family_id: "f1", child_id: "c2", name: "Klavír", place: "ZUŠ Bajkalská", dow: (dnes.getDay() + 2) % 7, start_time: "15:00", end_time: "15:45", starts_on: den(-100), ends_on: null, driver_to: "m2", driver_back: "m2", price: 2400, price_period: "pololeti", split_a: 50, note: null, archived: false, color: "#7c3aed" },
];

const events: any = [
  { id: "e1", family_id: "f1", child_id: "c1", kind: "parent_meeting", title: "Třídní schůzky s vyhodnocením prvního pololetí", starts_at: den(2) + "T17:00:00", ends_at: null, all_day: false, place: "ZŠ Komenského", note: null, created_by: "u1" },
  { id: "e2", family_id: "f1", child_id: "c2", kind: "medical", title: "Zubní prohlídka", starts_at: den(5) + "T09:30:00", ends_at: null, all_day: false, place: "MDDr. Nováková", note: null, created_by: "u1" },
];

const expenses: any = [
  { id: "x1", family_id: "f1", child_id: "c1", category: "school", title: "Obědy ve školní jídelně za listopad", amount: 1450, currency: "CZK", spent_on: den(-3), paid_by: "m1", split_a: 50, receipt_path: null, note: null, created_by: "u1", created_at: den(-3) },
  { id: "x2", family_id: "f1", child_id: "c2", category: "activities", title: "Klavír — pololetí", amount: 2400, currency: "CZK", spent_on: den(-10), paid_by: "m2", split_a: 50, receipt_path: null, note: null, created_by: "u2", created_at: den(-10) },
  { id: "x3", family_id: "f1", child_id: null, category: "clothing", title: "Zimní bunda a nepromokavé boty", amount: 3890, currency: "CZK", spent_on: den(-6), paid_by: "m1", split_a: 50, receipt_path: null, note: null, created_by: "u1", created_at: den(-6) },
];

const PREDMETY = ["Matematika", "Český jazyk", "Anglický jazyk", "Přírodověda", "Tělesná výchova", "Výtvarná výchova"];

const rozvrh: any = PREDMETY.map((predmet, i) => ({
  id: "r" + i, family_id: "f1", child_id: "c1", den: dnes.getDay(), poradi: i + 1,
  zacatek: String(8 + i).padStart(2, "0") + ":00",
  konec: String(8 + i).padStart(2, "0") + ":45",
  predmet, ucitel: "Nováková", mistnost: "3.B", parita: null, zdroj: "edupage",
}));

const ukoly: any = [
  { id: "h1", family_id: "f1", child_id: "c1", druh: "ukol", predmet: "Matematika", nadpis: "Pracovní sešit strana 42, cvičení 3 až 7", termin: den(1), obsah: null, autor: "Nováková", edupage_id: "1", created_at: den(-1) },
  { id: "h2", family_id: "f1", child_id: "c2", druh: "pisemka", predmet: "Zeměpis", nadpis: "Písemka — Evropa, vodstvo a pohoří", termin: den(3), obsah: null, autor: "Dvořák", edupage_id: "2", created_at: den(-1) },
];

export default function NahledMobil() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    // `spravce` je zapnutý schválně: menu správce je nejdelší, takže se
    // na něm pozná, když se položky přestanou vejít na obrazovku.
    <AppShell session={session} novychOznameni={2} neprectenychZprav={1} spravce>
      <Dashboard
        session={session}
        kroky={[]}
        patterns={patterns}
        overrides={[]}
        activities={activities}
        occurrences={[]}
        events={events}
        expenses={expenses}
        rozvrh={rozvrh}
        rozvrhZmeny={[]}
        ukoly={ukoly}
      />
    </AppShell>
  );
}
