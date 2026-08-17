import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Cíl odkazů z potvrzovacích e-mailů a magic linků.
 * Vymění `code` za session a přesměruje dál.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("dal") ?? "/prehled";

  if (!code) {
    return NextResponse.redirect(`${origin}/prihlaseni?chyba=chybi-kod`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/prihlaseni?chyba=${encodeURIComponent(error.message)}`);
  }

  const safeNext = next.startsWith("/") ? next : "/prehled";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
