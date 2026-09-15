import { NextResponse, type NextRequest } from "next/server";
import { DRUHY, otiskNavstevnika, zarizeniZProhlizece, zaznamenej } from "@/lib/provoz";
import { klicVolajiciho, Limit, MINUTA } from "@/lib/limit";

export const dynamic = "force-dynamic";

/**
 * Každá událost je zápis do databáze, takže tenhle koncový bod je ze
 * všech veřejných ten nejlákavější — nafouknout někomu statistiky
 * a zaplnit tabulku jde jedním cyklem v konzoli.
 *
 * Šedesát událostí za minutu je nad tím, co nasbírá i rychlé proklikání
 * webu, a hluboko pod tím, co za minutu pošle skript.
 */
const LIMIT = new Limit(60, MINUTA);

/**
 * Sběrné místo měření. Krátká cesta schválně — `/api/analytics` blokují
 * i ta nejmírnější rozšíření a měřili bychom pak jen část lidí.
 *
 * Odpovídá 204 a nikdy chybou: měření nesmí být vidět ani na rychlosti
 * stránky, ani na tom, že by něco spadlo.
 */
export async function POST(request: NextRequest) {
  try {
    const telo = (await request.json().catch(() => ({}))) as {
      druh?: string;
      cesta?: string;
      odkud?: {
        referrer?: string;
        utm_source?: string;
        utm_medium?: string;
        utm_campaign?: string;
        ref?: string;
      };
    };

    const druh = telo.druh ?? "zobrazeni";
    if (!(DRUHY as readonly string[]).includes(druh)) {
      return new NextResponse(null, { status: 204 });
    }

    const ip = klicVolajiciho(request.headers);
    const ua = request.headers.get("user-agent");

    // Odmítnutí vypadá stejně jako přijetí: měření nemá útočníkovi
    // říkat, jestli se trefil.
    if (LIMIT.prekrocen(ip ?? "neznámá")) {
      return new NextResponse(null, { status: 204 });
    }

    // Roboti si stránky prohlížejí taky, ale do trychtýře nepatří.
    if (ua && /bot|crawler|spider|preview|monitor|curl|wget/i.test(ua)) {
      return new NextResponse(null, { status: 204 });
    }

    await zaznamenej(
      druh,
      { cesta: telo.cesta, ...(telo.odkud ?? {}) },
      otiskNavstevnika(ip, ua),
      zarizeniZProhlizece(ua),
    );
  } catch {
    // Měření mlčí i když se pokazí.
  }

  return new NextResponse(null, { status: 204 });
}
