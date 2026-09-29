import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncUserCalendar } from "@/lib/google-sync";

export const maxDuration = 60;

/** Ruční spuštění synchronizace z nastavení. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nepřihlášeno" }, { status: 401 });
  }

  try {
    const result = await syncUserCalendar(user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Synchronizace selhala.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
