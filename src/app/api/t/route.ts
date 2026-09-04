import { NextResponse, type NextRequest } from "next/server";
import { DRUHY, otiskNavstevnika, zarizeniZProhlizece, zaznamenej } from "@/lib/provoz";

export const dynamic = "force-dynamic";

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

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip");
    const ua = request.headers.get("user-agent");

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
