import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/google";

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

  // `//neco.cz` taky začíná lomítkem, ale prohlížeč to čte jako cizí doménu.
  const dal = searchParams.get("dal") ?? "/prehled";
  const kam = dal.startsWith("/") && !dal.startsWith("//") ? dal : "/prehled";

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

  return NextResponse.redirect(`${zaklad}${kam}`);
}
