import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { vytvorDocx } from "@/lib/docx";
import { vypisKomunikace, type Zprava } from "@/lib/zpravy";

/**
 * Výpis komunikace ke stažení.
 *
 * Word, ne PDF: české znaky v ručně skládaném PDF vyžadují vložený font
 * a jedno chybějící „ř" udělá z výpisu dokument, kterému nikdo nevěří.
 * Advokáti navíc s Wordem pracují a chtějí si do něj psát poznámky.
 *
 * Čte se jménem přihlášeného, takže RLS pustí jen jeho vlastní rodinu.
 */
export async function GET() {
  const session = await requireSession();
  const supabase = await createClient();

  const { data } = await supabase
    .from("zpravy")
    .select("*, precteni:zpravy_precteni(user_id, precteno_at)")
    .eq("family_id", session.family.id)
    .order("created_at", { ascending: true });

  const zpravy = (data ?? []) as Zprava[];

  // Popisky kontextu — do výpisu patří „Lyžák Kuba", ne identifikátor.
  const [{ data: vydaje }, { data: udalosti }] = await Promise.all([
    supabase.from("expenses").select("id, title").eq("family_id", session.family.id),
    supabase.from("events").select("id, title").eq("family_id", session.family.id),
  ]);

  const soubor = vytvorDocx(
    vypisKomunikace(zpravy, session.family.name, {
      deti: Object.fromEntries(session.children.map((d) => [d.id, d.name])),
      vydaje: Object.fromEntries((vydaje ?? []).map((v) => [v.id, v.title])),
      udalosti: Object.fromEntries((udalosti ?? []).map((u) => [u.id, u.title])),
    }),
  );

  const nazev = `komunikace-${new Date().toISOString().slice(0, 10)}.docx`;

  return new NextResponse(new Uint8Array(soubor), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nazev}"`,
      "Cache-Control": "no-store",
    },
  });
}
