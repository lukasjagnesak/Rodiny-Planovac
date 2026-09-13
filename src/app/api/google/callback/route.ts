import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailFromIdToken, exchangeCode, siteUrl } from "@/lib/google";
import { encryptSecret } from "@/lib/crypto";

/** Návrat od Googlu — uloží refresh token a rovnou nabídne synchronizaci. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const settings = `${siteUrl()}/nastaveni/google`;

  if (errorParam) {
    return NextResponse.redirect(`${settings}?chyba=${encodeURIComponent(errorParam)}`);
  }

  const expectedState = request.cookies.get("rp_google_state")?.value;
  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(`${settings}?chyba=neplatny-stav`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(`${siteUrl()}/prihlaseni`);

  try {
    const tokens = await exchangeCode(code);

    if (!tokens.refresh_token) {
      // Google pošle refresh token jen při prvním souhlasu — uživatel musí
      // přístup odebrat v účtu Google a zkusit znovu.
      return NextResponse.redirect(`${settings}?chyba=bez-refresh-tokenu`);
    }

    const admin = createAdminClient();
    const { error } = await admin.from("google_accounts").upsert(
      {
        user_id: user.id,
        google_email: emailFromIdToken(tokens.id_token),
        refresh_token: encryptSecret(tokens.refresh_token),
        calendar_id: "primary",
        last_sync_error: null,
      },
      { onConflict: "user_id" },
    );

    if (error) throw error;

    const response = NextResponse.redirect(`${settings}?stav=propojeno`);
    response.cookies.delete("rp_google_state");
    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : "neznama-chyba";
    return NextResponse.redirect(`${settings}?chyba=${encodeURIComponent(message.slice(0, 200))}`);
  }
}
