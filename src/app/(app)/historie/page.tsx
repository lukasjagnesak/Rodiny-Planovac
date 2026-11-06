import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { nactiPredplatne } from "@/lib/predplatne";
import { OBLASTI } from "@/lib/historie";
import { HistorieScreen, NA_STRANCE } from "@/components/historie/historie-screen";
import type { ZaznamHistorie } from "@/lib/types";

export const metadata: Metadata = { title: "Historie změn" };

/**
 * Historie změn — kdo, kdy a co změnil. Vidí ji oba rodiče stejně.
 *
 * Záznamy zapisuje databáze při každé změně (migrace 0034); z aplikace
 * je nejde upravit ani smazat. Výpis ke stažení má ověřovací kód.
 */
export default async function HistoriePage({
  searchParams,
}: {
  searchParams: Promise<{ oblast?: string }>;
}) {
  const session = await requireSession();
  const supabase = await createClient();
  const { oblast } = await searchParams;
  const filtr = oblast && oblast in OBLASTI ? (oblast as ZaznamHistorie["oblast"]) : null;

  let dotaz = supabase
    .from("historie")
    .select("*")
    .eq("family_id", session.family.id)
    .order("kdy", { ascending: false })
    .order("id", { ascending: false })
    .limit(NA_STRANCE);
  if (filtr) dotaz = dotaz.eq("oblast", filtr);

  const [{ data }, pristup] = await Promise.all([dotaz, nactiPredplatne(session.family.id)]);
  return (
    <HistorieScreen
      zaznamy={(data ?? []) as ZaznamHistorie[]}
      filtr={filtr}
      muzeStahnout={pristup.muzeZapisovat}
    />
  );
}
