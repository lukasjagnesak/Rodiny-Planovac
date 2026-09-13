import "server-only";

import { addDays } from "date-fns";
import { createClient } from "./supabase/server";
import { toDateKey } from "./dates";
import { slozOznameni, pocetNovych, type Oznameni } from "./oznameni";
import type { Activity, ActivityOccurrence, FamilyEvent, RozvrhZmena, SessionContext } from "./types";

/**
 * Načte podklady pro oznámení a poskládá je.
 *
 * Používá to jak stránka s oznámeními, tak zvoneček v liště — proto je to
 * na jednom místě. Dvě různá počítání téhož by se dřív nebo později
 * rozešla a zvoneček by svítil na něco, co na stránce není.
 */
export async function nactiOznameni(session: SessionContext): Promise<{
  oznameni: Oznameni[];
  videnoDo: string | null;
  novych: number;
}> {
  const supabase = await createClient();
  const dnes = new Date();
  const od = toDateKey(addDays(dnes, -1));
  const do_ = toDateKey(addDays(dnes, 21));

  const [stav, edupage, udalosti, zmeny, jizdy, krouzky] = await Promise.all([
    supabase
      .from("oznameni_stav")
      .select("videno_do")
      .eq("user_id", session.userId)
      .eq("family_id", session.family.id)
      .maybeSingle(),
    supabase
      .from("edupage_items")
      .select("id, druh, text, predmet, termin, zadano, hotovo, autor, child_id")
      .eq("family_id", session.family.id)
      .eq("skryto", false)
      .order("zadano", { ascending: false, nullsFirst: false })
      .limit(60),
    supabase
      .from("events")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("starts_at", `${od}T00:00:00Z`)
      .lte("starts_at", `${do_}T23:59:59Z`)
      .order("starts_at"),
    supabase
      .from("rozvrh_zmeny")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("den", toDateKey(dnes)),
    supabase
      .from("activity_occurrences")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("day", toDateKey(dnes))
      .lte("day", do_),
    supabase.from("activities").select("*").eq("family_id", session.family.id),
  ]);

  const podleId = new Map(
    ((krouzky.data ?? []) as Activity[]).map((a) => [a.id, a]),
  );

  const oznameni = slozOznameni(
    {
      edupage: (edupage.data ?? []) as never,
      udalosti: (udalosti.data ?? []) as FamilyEvent[],
      zmeny: (zmeny.data ?? []) as RozvrhZmena[],
      jizdy: ((jizdy.data ?? []) as ActivityOccurrence[]).map((j) => ({
        ...j,
        activity: podleId.get(j.activity_id) ?? null,
      })),
      deti: session.children,
      userId: session.userId,
    },
    dnes,
  );

  const videnoDo = (stav.data?.videno_do as string | undefined) ?? null;

  return { oznameni, videnoDo, novych: pocetNovych(oznameni, videnoDo) };
}

/** Zapíše, že uživatel oznámení viděl. */
export async function oznacPrectene(session: SessionContext): Promise<void> {
  const supabase = await createClient();
  await supabase.from("oznameni_stav").upsert(
    {
      user_id: session.userId,
      family_id: session.family.id,
      videno_do: new Date().toISOString(),
    },
    { onConflict: "user_id,family_id" },
  );
}
