import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/prihlaseni",
  "/registrace",
  "/pozvanka",
  "/auth",
  // Veřejný web je vstupní brána z vyhledávače — přihlášení tam nesmí
  // být, jinak celý ten kanál nefunguje. Úvodní stránka si přihlášeného
  // přesměruje do aplikace sama.
  "/",
  "/jak-funguje-stridava-pece",
  "/vzor-dohody-o-stridave-peci",
  "/kalkulacka-vyzivneho",
  "/kalkulacka",
  "/cenik",
  "/dekujeme",
  "/checklist-prvnich-30-dni",
  "/pro-advokaty",
  "/pro-mediatory",
  "/zasady-ochrany-osobnich-udaju",
  "/obchodni-podminky",
  "/sitemap.xml",
  "/robots.txt",
  "/api/kalkulacka",
  "/api/lead",
  "/api/t",
  "/api/checklist",
  "/api/cron",
  // Chráněné vlastním tajemstvím, ne přihlášením.
  "/api/mail/kontrola",
  // Stripe chodí bez cookies a podpis si ověřuje route sama.
  "/api/stripe/webhook",
];

/**
 * Supabase klient spadne nejen když proměnné chybí, ale i když je adresa
 * rozbitá — třeba bez `https://` nebo s uvozovkami okolo. Obojí zachytíme tady,
 * ať uživatel dostane vysvětlení místo pádu.
 */
function configProblem(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) return true;

  try {
    const parsed = new URL(url);
    return parsed.protocol !== "https:" && parsed.protocol !== "http:";
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest) {
  // Místo bílé chyby 500 ukážeme stránku, která řekne, co doplnit.
  if (configProblem() && request.nextUrl.pathname !== "/chybi-nastaveni") {
    const url = request.nextUrl.clone();
    url.pathname = "/chybi-nastaveni";
    url.search = "";
    return NextResponse.rewrite(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Obnovení session — musí proběhnout před jakýmkoli rozhodnutím o přesměrování.
  // Když je Supabase nedostupná, nechceme shodit celou aplikaci: tváříme se
  // jako nepřihlášený uživatel a stránka se sama postará o chybovou hlášku.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/prihlaseni";
    url.searchParams.set("dal", path);
    return NextResponse.redirect(url);
  }

  if (user && (path === "/prihlaseni" || path === "/registrace")) {
    const url = request.nextUrl.clone();
    url.pathname = "/prehled";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Vše kromě statických souborů a obrázků.
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
