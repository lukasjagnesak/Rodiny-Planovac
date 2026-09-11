import type { Metadata } from "next";
import { eachDayOfInterval } from "date-fns";
import { requireSession } from "@/lib/session";
import { nactiPredplatne } from "@/lib/predplatne";
import { ZamcenyDokument } from "@/components/ui/zamceno";
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

  // Listina je produkt, ne zapsaná data. Čísla, ze kterých vzniká,
  // zůstávají v aplikaci čitelná i bez předplatného; složit z nich
  // dokument pro soud je to, za co se platí — a je to zároveň chvíle,
  // kdy má rodina k předplatnému nejblíž.
  const pristup = await nactiPredplatne(session.family.id);
  if (!pristup.muzeZapisovat) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            Souhrn pro soud a advokáta
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Kolik nocí děti u koho byly, co se za ně utratilo a kdo vozil.
          </p>
        </div>
        <ZamcenyDokument
          nadpis="Souhrn se vytváří s předplatným"
          popis="Podklad pro soud, advokáta nebo mediátora složí Klidoo z toho, co máte zapsané — noci u rodičů, náklady i odvozy za zvolené období."
        />
      </div>
    );
  }

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
