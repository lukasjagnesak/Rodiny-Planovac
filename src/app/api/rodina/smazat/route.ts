import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { smazRodinu } from "@/lib/mazani";

/**
 * Smazání rodiny. Smí jen vlastník a jen s potvrzením názvu.
 *
 * Název se ověřuje i tady, ne jen v prohlížeči: tohle je jediné volání
 * v celé aplikaci, po kterém se nedá nic vrátit.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ chyba: "Nepřihlášeno." }, { status: 401 });

  const { familyId, potvrzeni } = (await request.json().catch(() => ({}))) as {
    familyId?: string;
    potvrzeni?: string;
  };
  if (!familyId) return NextResponse.json({ chyba: "Chybí rodina." }, { status: 400 });

  const { data: clenstvi } = await supabase
    .from("family_members")
    .select("role, family:families(name)")
    .eq("family_id", familyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!clenstvi || clenstvi.role !== "owner") {
    return NextResponse.json({ chyba: "Rodinu smí smazat jen její správce." }, { status: 403 });
  }

  const nazev = (clenstvi.family as unknown as { name: string } | null)?.name ?? "";
  if ((potvrzeni ?? "").trim() !== nazev.trim()) {
    return NextResponse.json({ chyba: "Název rodiny nesouhlasí." }, { status: 400 });
  }

  const vysledek = await smazRodinu(familyId);
  return NextResponse.json({ smazano: true, ...vysledek });
}
