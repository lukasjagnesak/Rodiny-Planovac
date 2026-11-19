import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { behFronty } from "@/lib/mailchimp/beh";
import { mailchimpKlient, mailchimpNastaveni, stavZRadku } from "@/lib/mailchimp/server";
import { migrace } from "@/lib/mailchimp/synchronizace";
import { ohlas } from "@/lib/poplach";

export const maxDuration = 280;
export const dynamic = "force-dynamic";

function autorizovano(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const dodany = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  if (!secret) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(dodany);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Synchronizace do Mailchimpu. Kontejner `cron-marketing` to volá
 * každých pět minut.
 *
 *   ?rezim=fronta (výchozí)  zpracuje frontu a zařadí kontakty k rekonciliaci
 *   ?rezim=migrace&dry=1     jednorázová migrace naprázdno (jen čte)
 *   ?rezim=migrace&dry=0     ostrá migrace — jen zařadí do fronty
 *
 * Odpověď obsahuje jen počty, žádné adresy.
 */
export async function GET(request: NextRequest) {
  if (!autorizovano(request)) {
    return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  }

  const rezim = request.nextUrl.searchParams.get("rezim") ?? "fronta";
  const db = createAdminClient();
  const n = mailchimpNastaveni();

  try {
    if (rezim === "migrace") {
      const dryRun = request.nextUrl.searchParams.get("dry") !== "0";
      if (!n.nastaveno) {
        return NextResponse.json({ error: "Chybí MAILCHIMP_API_KEY nebo MAILCHIMP_AUDIENCE_ID." }, { status: 400 });
      }
      if (!dryRun && !n.zapnuto) {
        return NextResponse.json({ error: "Ostrá migrace vyžaduje MAILCHIMP_ZAPNUTO=1." }, { status: 400 });
      }

      const { count: uzivatelu } = await db.from("profiles").select("id", { count: "exact", head: true });
      const { data: radky, error } = await db.from("marketing_kontakty").select("user_id").eq("souhlas", true);
      if (error) throw new Error(error.message);

      const kontakty = [];
      for (const r of radky ?? []) {
        const { data } = await db.rpc("marketing_stav", { p_user: r.user_id });
        if (data) kontakty.push(stavZRadku(data as Record<string, unknown>));
      }

      const vysledek = await migrace(mailchimpKlient(), kontakty, dryRun, async (userId) => {
        const { error: e } = await db.rpc("marketing_zarad", { p_user: userId });
        if (e) throw new Error(e.message);
      });

      return NextResponse.json({
        ...vysledek,
        uzivatelu: uzivatelu ?? null,
        bezSouhlasu: (uzivatelu ?? 0) - (radky?.length ?? 0),
      });
    }

    // Průběžná rekonciliace: malá dávka kontaktů, které se den
    // nesynchronizovaly. Za den se tak projdou všechny, bez nárazů na API.
    let rekonciliace = 0;
    if (n.nastaveno && n.zapnuto) {
      const { data } = await db.rpc("marketing_rekonciliace", { p_limit: 20 });
      rekonciliace = Number(data ?? 0);
    }

    const fronta = await behFronty();

    const { count: vzdano } = await db
      .from("marketing_fronta")
      .select("id", { count: "exact", head: true })
      .eq("stav", "vzdano");

    return NextResponse.json({ rekonciliace, fronta, vzdano: vzdano ?? 0 });
  } catch (e) {
    await ohlas(e, { kde: `mailchimp/cron:${rezim}` });
    return NextResponse.json({ error: "Běh selhal, podrobnosti v poplachu." }, { status: 500 });
  }
}
