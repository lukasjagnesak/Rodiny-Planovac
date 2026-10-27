import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { bezpecnyCil, odkazNaPrihlaseni } from "@/lib/navrat";
import { novyNonce, otiskSkriptu, sestavCsp } from "@/lib/csp";
import { smiMerit } from "@/lib/mereni-hranice";
import { INSTALACE_SCRIPT, THEME_SCRIPT } from "@/lib/vlozene-skripty";

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
  // Vstupní stránka z placené reklamy. Není v mapě webu (je `noindex`),
  // a tak ji hlídá test, který prochází všechny veřejné skupiny stránek.
  "/vyzkouset",
  "/cenik",
  "/clanky",
  "/dekujeme",
  "/checklist-prvnich-30-dni",
  "/pro-advokaty",
  "/pro-mediatory",
  "/pro-ospod-a-soudy",
  "/zasady-ochrany-osobnich-udaju",
  "/bezpecnost",
  // security.txt — kontakt pro nahlášení chyby v zabezpečení.
  "/.well-known",
  "/obchodni-podminky",
  "/sitemap.xml",
  "/robots.txt",
  "/api/kalkulacka",
  // Počet volných míst pro zakládající rodiny — jen jedno číslo.
  "/api/zakladajici",
  // Kalkulačka výživného: PDF na e-mail i odložení výpočtu před
  // registrací. Obojí volá člověk, který účet ještě nemá — bez tohohle
  // řádku ho middleware pošle na přihlášení a z volání se vrátí
  // přihlašovací stránka místo odpovědi.
  "/api/vyzivne",
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

/**
 * Stránky mimo veřejný web, které jsou přesto předgenerované. Nonce do
 * nich dát nejde (vznikly při sestavení, ne u požadavku), takže dostanou
 * politiku webu. Ani jedna nepracuje s daty rodiny.
 */
const PREDGENEROVANE_MIMO_WEB = new Set(["/chybi-nastaveni", "/nahled-mobil"]);

/** Otisky se počítají jednou za běh serveru, texty se nemění. */
const otisky = Promise.all([otiskSkriptu(THEME_SCRIPT), otiskSkriptu(INSTALACE_SCRIPT)]);

/**
 * Politika pro tenhle požadavek, nebo `null` tam, kde se nevrací stránka.
 * Přísná s nonce všude, kde jsou data rodiny — viz `lib/csp`.
 */
async function politika(cesta: string): Promise<string | null> {
  if (cesta.startsWith("/api/") || cesta.startsWith("/auth/")) return null;
  const web = smiMerit(cesta) || PREDGENEROVANE_MIMO_WEB.has(cesta);
  return sestavCsp({
    nonce: web ? null : novyNonce(),
    otisky: web ? [] : await otisky,
    supabase: process.env.NEXT_PUBLIC_SUPABASE_URL,
    vyvoj: process.env.NODE_ENV === "development",
  });
}

export async function proxy(request: NextRequest) {
  // Místo bílé chyby 500 ukážeme stránku, která řekne, co doplnit.
  if (configProblem() && request.nextUrl.pathname !== "/chybi-nastaveni") {
    const url = request.nextUrl.clone();
    url.pathname = "/chybi-nastaveni";
    url.search = "";
    return NextResponse.rewrite(url);
  }

  // Next si nonce přečte z hlavičky požadavku a přidá ho ke všem svým
  // skriptům. Prohlížeč pak dostane tutéž politiku v odpovědi.
  const csp = await politika(request.nextUrl.pathname);
  const hlavicky = new Headers(request.headers);
  if (csp) hlavicky.set("Content-Security-Policy", csp);
  const dal = () => {
    const odpoved = NextResponse.next({ request: { headers: hlavicky } });
    if (csp) odpoved.headers.set("Content-Security-Policy", csp);
    return odpoved;
  };

  let response = dal();

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
          // Obnovené cookies musí jít dál i v hlavičkách, které předáváme.
          hlavicky.set("cookie", request.cookies.toString());
          response = dal();
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
    return NextResponse.redirect(odkazNaPrihlaseni(request.nextUrl));
  }

  // Přihlášený na přihlašovací stránce nemá co dělat — ale když ho sem
  // poslala vlastní adresa s cílem (`?dal=…`), pustíme ho na ten cíl.
  // Jinak by se zahodilo všechno, co po přihlášení mělo pokračovat:
  // pozvánka, odložený výpočet z kalkulačky, rozepsaná cesta kamkoli.
  if (prihlaseny && (path === "/prihlaseni" || path === "/registrace")) {
    const url = request.nextUrl.clone();
    url.search = "";
    const cil = bezpecnyCil(request.nextUrl.searchParams.get("dal"), "/prehled");
    const rozdeleno = cil.indexOf("?");
    url.pathname = rozdeleno < 0 ? cil : cil.slice(0, rozdeleno);
    if (rozdeleno >= 0) url.search = cil.slice(rozdeleno);
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
