import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { smazUcet } from "@/lib/mazani";

/** Smazání účtu. Potvrzuje se opsáním e-mailu, aby to nešlo omylem. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ chyba: "Nepřihlášeno." }, { status: 401 });

  const { potvrzeni } = (await request.json().catch(() => ({}))) as { potvrzeni?: string };

  if ((potvrzeni ?? "").trim().toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return NextResponse.json({ chyba: "E-mail nesouhlasí." }, { status: 400 });
  }

  const vysledek = await smazUcet(user.id);
  return NextResponse.json({ smazano: true, ...vysledek });
}
