import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ZAKLADAJICI } from "@/lib/tarify";

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
    { volno, mist: ZAKLADAJICI.mist },
    // Minuta stačí: číslo se mění, jen když vznikne rodina.
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
