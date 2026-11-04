import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ZAKLADAJICI } from "@/lib/tarify";

// Vždy z databáze, nikdy z doby sestavení — číslo se mění s každou rodinou.
export const dynamic = "force-dynamic";

/**
 * Kolik míst pro zakládající rodiny ještě zbývá.
 *
 * Jen jedno číslo, nic o rodinách. Když se to nepovede zjistit (databáze
 * stojí, migrace 0030 ještě neproběhla), vrátí `null` a web ukáže
 * nabídku bez počítadla — radši žádné číslo než vymyšlené.
 */
export async function GET() {
  let volno: number | null = null;

  if (ZAKLADAJICI.aktivni) {
    try {
      const { data, error } = await createAdminClient().rpc("zakladajici_volno");
      if (!error && typeof data === "number") volno = data;
    } catch {
      volno = null;
    }
  } else {
    volno = 0;
  }

  return NextResponse.json(
    {
      volno,
      mist: ZAKLADAJICI.mist,
      // Kolik zakládajících rodin už je zaregistrovaných — dopočet z téhož
      // čísla z databáze (funkce zakladajici_volno počítá skutečné řádky).
      obsazeno: volno === null ? null : ZAKLADAJICI.mist - volno,
    },
    // Půl minuty: dost čerstvé, a přitom databázi nezahltí návštěvy z reklamy.
    { headers: { "Cache-Control": "public, max-age=30" } },
  );
}
