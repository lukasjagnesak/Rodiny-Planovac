import "server-only";

import { createAdminClient } from "./supabase/admin";
import { chybejiciTerminy, type Frekvence } from "./opakovani";
import { vyhodnot, type Predplatne } from "./predplatne-pravidla";
import { toDateKey } from "./dates";

/**
 * Generování výdajů z opakovaných šablon.
 *
 * Pouští se z hodinového cronu, takže na tentýž den doběhne mnohokrát.
 * Idempotenci nedělá tahle funkce, ale unikátní index nad
 * `(opakovani_id, spent_on)` — zdvojený výdaj je v aplikaci o penězích
 * mezi rozvedenými rodiči to nejhorší, co může vzniknout, a spoléhat
 * se u toho na správné pořadí volání by bylo málo.
 */

interface Sablona {
  id: string;
  family_id: string;
  child_id: string | null;
  category: string;
  title: string;
  amount: number;
  currency: string;
  paid_by: string | null;
  split_percent: number;
  frekvence: Frekvence;
  zacina: string;
  konci: string | null;
  note: string | null;
  created_by: string | null;
}

export interface VysledekGenerovani {
  sablon: number;
  vytvoreno: number;
  preskoceno: number;
}

export async function vygenerujOpakovaneVydaje(
  dnes: Date = new Date(),
): Promise<VysledekGenerovani> {
  const admin = createAdminClient();
  const vysledek: VysledekGenerovani = { sablon: 0, vytvoreno: 0, preskoceno: 0 };

  const { data: sablony } = await admin
    .from("vydaje_opakovane")
    .select(
      "id, family_id, child_id, category, title, amount, currency, paid_by, split_percent, frekvence, zacina, konci, note, created_by",
    )
    .eq("aktivni", true)
    .lte("zacina", toDateKey(dnes));

  if (!sablony || sablony.length === 0) return vysledek;

  // Předplatné se čte jednou pro všechny rodiny naráz, ne u každé šablony.
  const rodiny = [...new Set(sablony.map((s) => s.family_id as string))];
  const { data: predplatna } = await admin
    .from("predplatna")
    .select("family_id, stav, plati_do, stripe_customer_id, stripe_subscription_id, tarif")
    .in("family_id", rodiny);

  const muzeZapisovat = new Map<string, boolean>();
  for (const familyId of rodiny) {
    const zaznam = (predplatna ?? []).find((p) => p.family_id === familyId);
    muzeZapisovat.set(familyId, vyhodnot((zaznam as Predplatne | undefined) ?? null).muzeZapisovat);
  }

  for (const radek of sablony as unknown as Sablona[]) {
    vysledek.sablon += 1;

    // Rodině v režimu čtení nepřibývají výdaje. Zapisovat po vypršení
    // nesmí ani člověk, tak ať to nedělá ani cron za něj.
    if (!muzeZapisovat.get(radek.family_id)) {
      vysledek.preskoceno += 1;
      continue;
    }

    const { data: hotove } = await admin
      .from("expenses")
      .select("spent_on")
      .eq("opakovani_id", radek.id);

    const terminy = chybejiciTerminy(
      { zacina: radek.zacina, konci: radek.konci, frekvence: radek.frekvence },
      dnes,
      (hotove ?? []).map((v) => v.spent_on as string),
    );

    for (const den of terminy) {
      const { error } = await admin.from("expenses").insert({
        family_id: radek.family_id,
        child_id: radek.child_id,
        category: radek.category,
        title: radek.title,
        amount: radek.amount,
        currency: radek.currency,
        spent_on: den,
        paid_by: radek.paid_by,
        split_percent: radek.split_percent,
        note: radek.note,
        created_by: radek.created_by,
        opakovani_id: radek.id,
      });

      // 23505 = ten den už z téhle šablony existuje. Přesně proto ten index.
      if (error && error.code !== "23505") {
        console.error("[opakovane] vytvoření výdaje selhalo", radek.id, den, error.message);
        continue;
      }

      if (error) vysledek.preskoceno += 1;
      else vysledek.vytvoreno += 1;
    }
  }

  return vysledek;
}
