import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { posliMail, mailJeNastaveny } from "@/lib/mail";
import { pozvankaZprava } from "@/lib/mail-sablony";
import { siteUrl } from "@/lib/google";

/**
 * Pošle pozvánku e-mailem.
 *
 * Odkaz se dá zkopírovat i ručně a tahle cesta zůstává funkční, i když
 * SMTP není nastavené — proto se neúspěch vrací jako `poslano: false`,
 * ne jako chyba. Pozvánka už v databázi je, ať se stane cokoli.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ chyba: "Nepřihlášeno." }, { status: 401 });

  const { token } = (await request.json().catch(() => ({}))) as { token?: string };
  if (!token) return NextResponse.json({ chyba: "Chybí pozvánka." }, { status: 400 });

  // Čte se jménem uživatele: RLS pustí jen pozvánky z jeho rodin,
  // takže cizí e-mail se odsud nedá rozeslat.
  const { data: pozvanka } = await supabase
    .from("family_invites")
    .select("email, role, family_id, family:families(name)")
    .eq("token", token)
    .maybeSingle();

  if (!pozvanka) {
    return NextResponse.json({ chyba: "Pozvánka nenalezena." }, { status: 404 });
  }

  if (!mailJeNastaveny()) {
    return NextResponse.json({ poslano: false, duvod: "smtp-chybi" });
  }

  const admin = createAdminClient();
  const { data: profil } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const rodina = (pozvanka.family as unknown as { name: string } | null)?.name ?? "";

  const poslano = await posliMail(
    pozvanka.email as string,
    pozvankaZprava({
      odesilatel: profil?.full_name ?? "",
      rodina,
      odkaz: `${siteUrl()}/pozvanka/${token}`,
      role: pozvanka.role === "parent" || pozvanka.role === "owner" ? "rodic" : "jiny",
    }),
  );

  return NextResponse.json({ poslano });
}
