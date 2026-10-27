import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard/dashboard";
import { MonthView } from "@/components/calendar/month-view";
import { ZadostiZmeny } from "@/components/calendar/zadosti-zmeny";
import { ExpensesScreen } from "@/components/expenses/expenses-screen";
import { ActivitiesScreen } from "@/components/activities/activities-screen";
import { ZpravyScreen } from "@/components/zpravy/zpravy-screen";
import { RozvrhScreen } from "@/components/rozvrh/rozvrh-screen";
import { ukazkovaRodina } from "@/lib/ukazkova-rodina";
import { HistorieScreen } from "@/components/historie/historie-screen";

/**
 * Skutečné obrazovky aplikace s ukázkovou rodinou — zdroj snímků na web.
 *
 * Web dřív ukazoval ručně překreslené imitace aplikace. Vypadaly jinak
 * než aplikace a rodič, který se zaregistroval, pak viděl něco jiného,
 * než čemu uvěřil. Tady se kreslí opravdové komponenty a skript
 * `scripts/snimky-aplikace.mjs` z nich udělá obrázky do `public/ukazky`.
 *
 * Jen pro vývoj, v ostrém provozu neexistuje (stejně jako `nahled-mobil`).
 */
const OBRAZOVKY = ["prehled", "kalendar", "vydaje", "krouzky", "zpravy", "rozvrh", "historie"] as const;
type Obrazovka = (typeof OBRAZOVKY)[number];

export default async function UkazkaObrazovky({
  params,
}: {
  params: Promise<{ obrazovka: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { obrazovka } = await params;
  if (!OBRAZOVKY.includes(obrazovka as Obrazovka)) notFound();

  const r = ukazkovaRodina();
  const dnes = new Date();
  const mesic = `${dnes.getFullYear()}-${String(dnes.getMonth() + 1).padStart(2, "0")}`;

  const obsah: Record<Obrazovka, React.ReactNode> = {
    prehled: (
      <Dashboard
        session={r.session}
        kroky={[]}
        patterns={r.patterns}
        overrides={[]}
        activities={r.activities}
        occurrences={r.occurrences}
        events={r.events}
        // Přehled dostává v aplikaci jen výdaje tohoto měsíce.
        expenses={r.expenses.filter((e) => e.spent_on.startsWith(mesic))}
        rozvrh={r.rozvrh}
        rozvrhZmeny={[]}
        ukoly={[]}
      />
    ),
    kalendar: (
      <div className="space-y-4">
        <ZadostiZmeny session={r.session} zadosti={r.zadosti} />
        <MonthView
          session={r.session}
          monthKey={mesic}
          initialChildId="all"
          patterns={r.patterns}
          overrides={[]}
          activities={r.activities}
          occurrences={r.occurrences}
          events={r.events}
          rozvrh={[]}
          rozvrhZmeny={[]}
        />
      </div>
    ),
    vydaje: (
      <ExpensesScreen
        session={r.session}
        expenses={r.expenses}
        opakovane={r.opakovane}
        monthKey={mesic}
        prefillDate={null}
      />
    ),
    krouzky: (
      <ActivitiesScreen
        session={r.session}
        activities={r.activities}
        occurrences={r.occurrences}
        weekStartKey={r.pondeli}
      />
    ),
    historie: <HistorieScreen zaznamy={r.historie} filtr={null} muzeStahnout />,
    zpravy: <ZpravyScreen session={r.session} zpravy={r.zpravy} muzePsat muzeStahnout />,
    rozvrh: <RozvrhScreen session={r.session} hodiny={r.rozvrh} zmeny={[]} edupagePropojeno />,
  };

  return (
    <AppShell session={r.session} novychOznameni={0} neprectenychZprav={0}>
      {obsah[obrazovka as Obrazovka]}
    </AppShell>
  );
}
