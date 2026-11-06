import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { vytvorDocx } from "@/lib/docx";
import { vypisHistorie } from "@/lib/historie";
import { nactiPredplatne } from "@/lib/predplatne";
import { novyKod, otiskSouboru, vetaOvereni, zaregistrujVypis } from "@/lib/vypisy";
import { siteUrl } from "@/lib/google";
import type { ZaznamHistorie } from "@/lib/types";

/**
 * Výpis historie změn ke stažení, s ověřovacím kódem.
 *
 * Čte se jménem přihlášeného, takže RLS pustí jen jeho vlastní rodinu.
 * Stažení se samo zapíše do historie (zaregistrujVypis).
 */
export async function GET() {
  const session = await requireSession();

  const pristup = await nactiPredplatne(session.family.id);
  if (!pristup.muzeZapisovat) {
    return NextResponse.json(
      { chyba: "Výpis se vytváří s předplatným. Historie zůstává čitelná v aplikaci." },
      { status: 402 },
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("historie")
    .select("*")
    .eq("family_id", session.family.id)
    .order("kdy", { ascending: true })
    .order("id", { ascending: true });
  const zaznamy = (data ?? []) as ZaznamHistorie[];

  const kod = novyKod();
  const overeni = { druh: "drobne" as const, text: vetaOvereni(kod, siteUrl()) };
  const odstavce = vypisHistorie(zaznamy, session.family.name);
  const soubor = vytvorDocx([odstavce[0], overeni, ...odstavce.slice(1), overeni]);

  await zaregistrujVypis({
    session,
    kod,
    druh: "historie",
    od: zaznamy[0]?.kdy.slice(0, 10) ?? null,
    do: zaznamy.at(-1)?.kdy.slice(0, 10) ?? null,
    otisk: otiskSouboru(soubor),
    shrnuti: { zaznamu: zaznamy.length },
  });

  const nazev = `historie-zmen-${new Date().toISOString().slice(0, 10)}-${kod}.docx`;
  return new NextResponse(new Uint8Array(soubor), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nazev}"`,
      "Cache-Control": "no-store",
    },
  });
}
