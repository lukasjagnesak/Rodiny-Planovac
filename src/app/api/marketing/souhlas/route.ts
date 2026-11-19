import { NextResponse, after, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MARKETING_SOUHLAS } from "@/lib/marketing-souhlas";
import { behFronty } from "@/lib/mailchimp/beh";

/**
 * Udělení nebo odvolání marketingového souhlasu z nastavení.
 *
 * Zapisuje se přes RPC pod přihlášeným uživatelem — funkce v databázi
 * vezme `auth.uid()`, takže cizí souhlas změnit nejde. Synchronizace
 * do Mailchimpu se spustí hned po odpovědi; když se nepovede, úloha
 * zůstane ve frontě a vezme ji cron.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nepřihlášeno." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { souhlas?: unknown } | null;
  if (typeof body?.souhlas !== "boolean") {
    return NextResponse.json({ error: "Chybí volba." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("nastav_marketing_souhlas", {
    p_souhlas: body.souhlas,
    p_verze: MARKETING_SOUHLAS.verze,
    p_zdroj: "nastaveni",
  });
  if (error) {
    return NextResponse.json({ error: "Změnu se nepodařilo uložit. Zkuste to znovu." }, { status: 500 });
  }

  after(() => behFronty(5).then(() => undefined).catch(() => undefined));

  return NextResponse.json({ ok: true, souhlas: Boolean(data?.souhlas ?? body.souhlas) });
}
