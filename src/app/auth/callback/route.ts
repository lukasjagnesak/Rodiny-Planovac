import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/google";
import { bezpecnyCil } from "@/lib/navrat";
import { COOKIE_SOUHLAS, MARKETING_SOUHLAS } from "@/lib/marketing-souhlas";

/**
 * Cíl odkazů z potvrzovacích e-mailů a magic linků.
 *
 * Adresa se skládá z `NEXT_PUBLIC_SITE_URL`, ne z `request.url`. Za Caddy
 * vidí aplikace jen vlastní vnitřní adresu kontejneru, takže `origin` je
 * `http://0.0.0.0:3000` — a přesměrování na ni skončí v prohlížeči hláškou
 * „tento web není dostupný". Potkalo to každého, kdo klikl na potvrzovací
 * odkaz, protože chybná adresa byla i v úspěšné větvi.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const zaklad = siteUrl();

  const kam = bezpecnyCil(searchParams.get("dal"), "/prehled");

  const naPrihlaseni = (duvod: string) =>
    NextResponse.redirect(
      `${zaklad}/prihlaseni?chyba=${duvod}&dal=${encodeURIComponent(kam)}`,
    );

  // Odmítnutý odkaz Supabase nevrací jako chybu, ale jako parametry v URL.
  const kodChyby = searchParams.get("error_code");
  if (kodChyby) {
    return naPrihlaseni(kodChyby === "otp_expired" ? "odkaz-vyprsel" : "odkaz-neplatny");
  }

  const code = searchParams.get("code");
  if (!code) return naPrihlaseni("odkaz-neplatny");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth] výměna kódu za session selhala:", error.message);
    return naPrihlaseni("odkaz-vyprsel");
  }

  const odpoved = NextResponse.redirect(`${zaklad}${kam}`);

  // Souhlas zaškrtnutý při registraci přes Google (viz register-form).
  // Zapisuje se pod session právě přihlášeného — cizí účet tím ovlivnit nejde.
  const souhlas = request.cookies.get(COOKIE_SOUHLAS)?.value;
  if (souhlas) {
    if (souhlas === MARKETING_SOUHLAS.verze) {
      const { error: chybaSouhlasu } = await supabase.rpc("nastav_marketing_souhlas", {
        p_souhlas: true,
        p_verze: MARKETING_SOUHLAS.verze,
        p_zdroj: "registrace-google",
      });
      if (chybaSouhlasu) console.error("[auth] souhlas z registrace se neuložil:", chybaSouhlasu.message);
    }
    odpoved.cookies.set(COOKIE_SOUHLAS, "", { maxAge: 0, path: "/" });
  }

  return odpoved;
}
