import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { googleAuthUrl, siteUrl } from "@/lib/google";

/** Zahájení propojení s Google kalendářem. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${siteUrl()}/prihlaseni`);
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(`${siteUrl()}/nastaveni/google?chyba=nenastaveno`);
  }

  // `state` chrání proti CSRF — ověříme ho v callbacku proti cookie.
  const state = randomBytes(16).toString("hex");

  const response = NextResponse.redirect(googleAuthUrl(state));
  response.cookies.set("rp_google_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
