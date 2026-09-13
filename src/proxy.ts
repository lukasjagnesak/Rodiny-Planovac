import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const PUBLIC_PATHS = [
  // Přehled s vymyšlenými daty pro test rozvržení. V ostrém provozu
  // se nevykreslí — stránka sama vrací 404, viz `app/nahled-mobil`.
  "/nahled-mobil",
  // Odhlašovací odkaz z e-mailu musí fungovat bez přihlášení — kdo si
  // stáhl vzor dohody, žádný účet nemá.
  "/odhlasit",
  // Partnerský přehled si přihlášení řeší sám — partner nemusí mít
  // rodinu a rozvržení aplikace by ho poslalo do průvodce.
  "/partner",
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
  "/clanky",
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
  //
  // `getClaims()` ověří podpis tokenu rovnou tady, bez volání Supabase —
  // u projektu s asymetrickými klíči je to čistě místní výpočet. Tohle
  // běží u KAŽDÉHO požadavku včetně předstahování odkazů, takže jedno
  // ušetřené volání po síti je znát na každém kliknutí.
  //
  // Bezpečnost tím netrpí: tohle rozhodnutí jen posílá nepřihlášeného
  // na přihlašovací stránku. Kdo se dostane dál, projde `requireSession()`
  // a hlavně pravidly v databázi, která ho k cizím datům nepustí ani
  // s platným tokenem.
  let prihlaseny = false;
  try {
    const { data } = await supabase.auth.getClaims();
    prihlaseny = Boolean(data?.claims.sub);
  } catch {
    prihlaseny = false;
  }

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!prihlaseny && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/prihlaseni";
    url.searchParams.set("dal", path);
    return NextResponse.redirect(url);
  }

  if (prihlaseny && (path === "/prihlaseni" || path === "/registrace")) {
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
     *
     * `offline.html` tu musí být jmenovitě: bez toho ho middleware pošle
     * na přihlášení a service worker si do mezipaměti uloží přihlašovací
     * stránku. Rodič bez signálu by pak místo vysvětlení viděl formulář,
     * který nemá jak odeslat.
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
