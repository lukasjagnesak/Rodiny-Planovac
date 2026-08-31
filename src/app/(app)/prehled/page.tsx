import type { Metadata } from "next";
import { addDays, endOfMonth, startOfMonth, startOfYear } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { toDateKey } from "@/lib/dates";
import { Dashboard } from "@/components/dashboard/dashboard";
import type { Krok } from "@/components/dashboard/zaciname";
import type {
  Activity,
  ActivityOccurrence,
  CustodyOverride,
  CustodyPattern,
  Expense,
  FamilyEvent,
  RozvrhHodina,
  RozvrhZmena,
} from "@/lib/types";

export const metadata: Metadata = { title: "Přehled" };

export default async function DashboardPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const today = new Date();
  const monthStart = toDateKey(startOfMonth(today));
  const monthEnd = toDateKey(endOfMonth(today));
  const yearStart = toDateKey(startOfYear(today));
  const soon = toDateKey(addDays(today, 14));

  const [
    patterns,
    overrides,
    activities,
    occurrences,
    events,
    expenses,
    rozvrh,
    rozvrhZmeny,
    vsechnyVydaje,
    pozvanky,
  ] = await Promise.all([
    supabase
      .from("custody_patterns")
      .select("*")
      .eq("family_id", session.family.id),
    supabase
      .from("custody_overrides")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("day", yearStart),
    supabase
      .from("activities")
      .select("*")
      .eq("family_id", session.family.id)
      .eq("active", true),
    supabase
      .from("activity_occurrences")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("day", toDateKey(today))
      .lte("day", soon),
    supabase
      .from("events")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("starts_at", toDateKey(addDays(today, -1)))
      .order("starts_at")
      .limit(20),
    supabase
      .from("expenses")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("spent_on", monthStart)
      .lte("spent_on", monthEnd),
    supabase
      .from("rozvrh_hodiny")
      .select("*")
      .eq("family_id", session.family.id)
      .order("poradi"),
    supabase
      .from("rozvrh_zmeny")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("den", toDateKey(today)),
    supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("family_id", session.family.id),
    supabase
      .from("family_invites")
      .select("id", { count: "exact", head: true })
      .eq("family_id", session.family.id)
      .is("accepted_at", null),
  ]);

  const kroky = rozjezd({
    druhyRodicJe: session.members.filter((m) => m.role !== "viewer").length > 1,
    pozvankaOdeslana: (pozvanky.count ?? 0) > 0,
    detiJsou: session.children.length > 0,
    vydajJe: (vsechnyVydaje.count ?? 0) > 0,
    krouzekJe: (activities.data ?? []).length > 0,
    pripominkyJsou: Boolean(session.profile.telegram_chat_id),
  });

  return (
    <Dashboard
      session={session}
      kroky={kroky}
      patterns={(patterns.data ?? []) as CustodyPattern[]}
      overrides={(overrides.data ?? []) as CustodyOverride[]}
      activities={(activities.data ?? []) as Activity[]}
      occurrences={(occurrences.data ?? []) as ActivityOccurrence[]}
      events={(events.data ?? []) as FamilyEvent[]}
      expenses={(expenses.data ?? []) as Expense[]}
      rozvrh={(rozvrh.data ?? []) as RozvrhHodina[]}
      rozvrhZmeny={(rozvrhZmeny.data ?? []) as RozvrhZmena[]}
    />
  );
}

/**
 * Kroky, po kterých z aplikace začne být užitek.
 *
 * Pozvánka je první, protože se dvěma rodiči má Klidoo největší cenu.
 * Není to ale podmínka: sám v tom mít pořádek je plnohodnotný způsob
 * použití a druhý rodič nemusí chtít, nebo nemusí být komu psát.
 * Proto jde krok odmítnout a víc se neukáže.
 */
function rozjezd(stav: {
  druhyRodicJe: boolean;
  pozvankaOdeslana: boolean;
  detiJsou: boolean;
  vydajJe: boolean;
  krouzekJe: boolean;
  pripominkyJsou: boolean;
}): Krok[] {
  return [
    {
      klic: "druhy-rodic",
      titulek: "Pozvat druhého rodiče",
      popis: stav.pozvankaOdeslana && !stav.druhyRodicJe
        ? "Pozvánka čeká na přijetí"
        : "Uvidí stejný kalendář a nic neplatí. Nepovinné — Klidoo funguje i pro jednoho.",
      odkaz: "/deti",
      hotovo: stav.druhyRodicJe,
      ceka: stav.pozvankaOdeslana,
    },
    {
      klic: "deti",
      titulek: "Přidat děti",
      popis: "Jméno a barva stačí, zbytek se doplní časem",
      odkaz: "/deti",
      hotovo: stav.detiJsou,
    },
    {
      klic: "vydaj",
      titulek: "Zapsat první výdaj",
      popis: "Účtenku stačí vyfotit — vyrovnání se spočítá samo",
      odkaz: "/vydaje",
      hotovo: stav.vydajJe,
    },
    {
      klic: "krouzek",
      titulek: "Přidat kroužek",
      popis: "Kdo veze tam a kdo zpátky, aby se to neřešilo v pátek ráno",
      odkaz: "/krouzky",
      hotovo: stav.krouzekJe,
    },
    {
      klic: "pripominky",
      titulek: "Zapnout připomínky",
      popis: "Den předem přijde, co se chystá",
      odkaz: "/nastaveni/telegram",
      hotovo: stav.pripominkyJsou,
    },
  ];
}
