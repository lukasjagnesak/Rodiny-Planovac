import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ohlasNoveRodiny } from "@/lib/spravce-oznameni";

/**
 * Hned po založení rodiny nebo přijetí pozvánky: ohlásit správci.
 *
 * Nebere žádný vstup — projde, co ještě ohlášené není (značka
 * v databázi). Přihlášení je podmínkou jen proto, aby to nespouštěl
 * kdokoli z internetu; víc než „pošli, co čeká" se tím vyvolat nedá.
 * Kdyby volání neprošlo, pošle upozornění hodinový cron.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) return NextResponse.json({ ok: true });
  try {
    await ohlasNoveRodiny();
  } catch (chyba) {
    console.error("[ohlasit] selhalo", chyba);
  }
  return NextResponse.json({ ok: true });
}
