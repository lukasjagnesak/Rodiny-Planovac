import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Odpojení Google kalendáře.
 * Události, které už v kalendáři jsou, necháváme být — smazat je může
 * uživatel sám a nechceme mu nečekaně mazat záznamy.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Nepřihlášeno" }, { status: 401 });

  const admin = createAdminClient();
  await admin.from("google_event_links").delete().eq("user_id", user.id);
  await admin.from("google_accounts").delete().eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
