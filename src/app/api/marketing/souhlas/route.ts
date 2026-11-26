import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MARKETING_SOUHLAS } from "@/lib/marketing-souhlas";

/**
 * Udělení nebo odvolání marketingového souhlasu z Nastavení → E-maily.
 *
 * Napojeno na integraci s Mailchimpem, která běží v Supabase (Edge
 * Functions + tabulky `marketing_contacts`, `marketing_audit`):
 * - udělení = `marketing_request` → Mailchimp pošle potvrzovací e-mail
 *   (double opt-in),
 * - odvolání = `marketing_suppress` → zápis do `mail_odhlaseni`, trigger
 *   kontakt odhlásí i v Mailchimpu.
 *
 * Funkce smí volat jen servisní klíč; adresu bereme z přihlášeného účtu,
 * takže cizí souhlas změnit nejde.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Nepřihlášeno." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { souhlas?: unknown } | null;
  if (typeof body?.souhlas !== "boolean") {
    return NextResponse.json({ error: "Chybí volba." }, { status: 400 });
  }

  const admin = createAdminClient();
  const email = user.email.trim().toLowerCase();

  if (body.souhlas) {
    // Odhlášení je trvalé (tombstone) — marketing_request ho tiše ignoruje.
    const { data: odhlasen } = await admin.from("mail_odhlaseni").select("email").eq("email", email).maybeSingle();
    if (odhlasen) {
      return NextResponse.json(
        { error: "Odběr jste dříve zrušili. Pokud ho chcete znovu, napište nám na info@klidoo.cz." },
        { status: 409 },
      );
    }
    const { error } = await admin.rpc("marketing_request", {
      address: email,
      origin_source: "registration",
      version_text: MARKETING_SOUHLAS.verze,
      consent_text: MARKETING_SOUHLAS.text,
    });
    if (error) return NextResponse.json({ error: "Změnu se nepodařilo uložit. Zkuste to znovu." }, { status: 500 });
    return NextResponse.json({ ok: true, stav: "pending" });
  }

  const { error } = await admin.rpc("marketing_suppress", { address: email, why: "nastaveni" });
  if (error) return NextResponse.json({ error: "Změnu se nepodařilo uložit. Zkuste to znovu." }, { status: 500 });
  return NextResponse.json({ ok: true, stav: "suppressed" });
}
