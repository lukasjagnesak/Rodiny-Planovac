import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { stahniProUzivatele, zapisVysledek } from "@/lib/edupage-sync";
import { ACTIVE_FAMILY_COOKIE } from "@/lib/members";

export const maxDuration = 300;

/**
 * Ruční stažení z nastavení.
 *
 * Samotné stahování bydlí v `lib/edupage-sync.ts`, protože totéž dělá
 * i cron. Kdyby to byly dvě cesty, lišily by se — a rozdíl by se poznal
 * až tím, že automatické stahování ukládá jinam než tohle tlačítko.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Nepřihlášeno" }, { status: 401 });

  const preferovana = (await cookies()).get(ACTIVE_FAMILY_COOKIE)?.value ?? null;

  try {
    const vysledek = await stahniProUzivatele(user.id, preferovana);
    return NextResponse.json({
      ok: true,
      pocet: vysledek.ulozeno,
      zprav: vysledek.zprav,
      deti: vysledek.deti,
      chyby: vysledek.chyby,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stažení selhalo.";
    await zapisVysledek(user.id, message);
    // Chybějící propojení je chyba zadání, ne výpadek školy.
    const stav = /propojen|rodin|spárova/i.test(message) ? 400 : 502;
    return NextResponse.json({ error: message }, { status: stav });
  }
}
