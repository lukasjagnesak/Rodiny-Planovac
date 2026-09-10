import type { Metadata } from "next";
import { eachDayOfInterval } from "date-fns";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { expandActivities } from "@/lib/activities";
import { slozSouhrn } from "@/lib/souhrn";
import { toDateKey } from "@/lib/dates";
import { VolbaObdobi, urciObdobi } from "@/components/souhrn/volba-obdobi";
import { SouhrnDokument } from "@/components/souhrn/dokument";
import type {
  Activity,
  ActivityOccurrence,
  CustodyOverride,
  CustodyPattern,
  Expense,
} from "@/lib/types";

export const metadata: Metadata = { title: "Souhrn pro soud a advokáta" };

/**
 * Souhrn péče a nákladů za období.
 *
 * Vzniklo to jako odpověď na otázku, která u střídavé péče přijde vždycky:
 * kolik nocí děti u koho byly a kdo co platil. Rodiče na to dosud
 * odpovídali z paměti — každý jinak — a advokát z toho skládal podání.
 *
 * Dokument si vygeneruje rodina sama a dá ho, komu chce. Klidoo nikam nic
 * neposílá; komu se ukáže, rozhoduje ta rodina, a to i proto, že jde
 * o údaje o dětech a o penězích obou rodičů.
 *
 * Do PDF se to dostane přes tisk prohlížeče. Zní to jako ústupek, ale
 * je to lepší než knihovna na PDF: sazbu vidí člověk dřív, než ji uloží,
 * dokument se dá zvětšit i přečíst odečítačem obrazovky a nemusí se
 * udržovat druhá verze rozvržení, která by se s tou na obrazovce
 * dřív nebo později rozešla.
 */
export default async function SouhrnPage({
  searchParams,
}: {
  searchParams: Promise<{ od?: string; do?: string }>;
}) {
  const session = await requireSession();
  const supabase = await createClient();
  const parametry = await searchParams;

  const { od, do: doData, klic } = urciObdobi(parametry.od, parametry.do);
  const odKlic = toDateKey(od);
  const doKlic = toDateKey(doData);

  const [patterns, overrides, vydaje, aktivity, terminy] = await Promise.all([
    supabase.from("custody_patterns").select("*").eq("family_id", session.family.id),
    supabase
      .from("custody_overrides")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("day", odKlic)
      .lte("day", doKlic),
    supabase
      .from("expenses")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("spent_on", odKlic)
      .lte("spent_on", doKlic)
      .order("spent_on"),
    supabase.from("activities").select("*").eq("family_id", session.family.id),
    supabase
      .from("activity_occurrences")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("day", odKlic)
      .lte("day", doKlic),
  ]);

  // Jízdy se skládají ze vzoru kroužku a zapsaných výjimek — v tabulce
  // termínů leží jen ty dny, u kterých někdo něco změnil.
  const dny = eachDayOfInterval({ start: od, end: doData });
  const jizdy = [
    ...expandActivities(
      dny,
      (aktivity.data ?? []) as Activity[],
      (terminy.data ?? []) as ActivityOccurrence[],
    ).values(),
  ].flat();

  const souhrn = slozSouhrn({
    od,
    do: doData,
    deti: session.children,
    members: session.members,
    patterns: (patterns.data ?? []) as CustodyPattern[],
    overrides: (overrides.data ?? []) as CustodyOverride[],
    vydaje: (vydaje.data ?? []) as Expense[],
    jizdy,
  });

  return (
    <div className="space-y-5">
      <VolbaObdobi aktivni={klic} od={odKlic} do={doKlic} />
      <SouhrnDokument souhrn={souhrn} session={session} />
    </div>
  );
}
