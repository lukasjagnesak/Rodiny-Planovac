import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { HODINA, klicVolajiciho, Limit } from "@/lib/limit";
import { ohlasNovyKontakt } from "@/lib/spravce-oznameni";

/**
 * Sběr kontaktů z veřejného webu.
 *
 * Pojistka proti zaplavení je společná pro všechny veřejné koncové body
 * — viz `lib/limit.ts`. Patnáct odeslání za hodinu je nad rámec toho,
 * co udělá člověk, a pod tím, co stihne robot.
 */
const LIMIT = new Limit(15, HODINA);

function text(hodnota: unknown, maxDelka: number): string | null {
  if (typeof hodnota !== "string") return null;
  const orezano = hodnota.trim().slice(0, maxDelka);
  return orezano || null;
}

export async function POST(request: NextRequest) {
  if (LIMIT.prekrocen(klicVolajiciho(request.headers) ?? "neznámá")) {
    return NextResponse.json(
      { error: "Zkoušíš to moc často. Dej tomu chvilku." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);

  // Návnada pro roboty: pole, které živý člověk nevidí a nevyplní.
  if (text(body?.web, 200)) {
    return NextResponse.json({ ok: true });
  }

  const email = text(body?.email, 200);
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "E-mail nevypadá platně." }, { status: 400 });
  }

  const magnet = text(body?.magnet, 60) ?? "newsletter";

  const admin = createAdminClient();

  // Obyčejný insert, ne upsert: unikátní index sedí na `lower(email)`,
  // což `on conflict` neumí pojmenovat sloupci. Duplicitu proto necháme
  // vzniknout a odchytíme ji níž.
  const { error } = await admin.from("leady").insert({
    email,
    magnet,
    jmeno: text(body?.jmeno, 120),
    organizace: text(body?.organizace, 160),
    telefon: text(body?.telefon, 40),
    zprava: text(body?.zprava, 2000),
    utm_source: text(body?.utm_source, 80),
    utm_medium: text(body?.utm_medium, 80),
    utm_campaign: text(body?.utm_campaign, 120),
    ref: text(body?.ref, 80),
    referrer: text(body?.referrer, 500),
    landing: text(body?.landing, 200),
  });

  if (error) {
    // Druhé odeslání stejného e-mailu na stejný materiál není chyba
    // uživatele — nejspíš mu první zpráva utekla. Tváříme se, že prošlo.
    if (error.code === "23505") return NextResponse.json({ ok: true });
    return NextResponse.json({ error: "Uložení se nepovedlo." }, { status: 500 });
  }

  // Správci do telefonu. Až po úspěšném zápisu, ať se neohlašuje kontakt,
  // který se neuložil — a bez `await`, protože návštěvník nemá čekat na
  // odeslání notifikace, aby dostal svůj materiál.
  void ohlasNovyKontakt({
    email,
    magnet,
    jmeno: text(body?.jmeno, 120),
    organizace: text(body?.organizace, 160),
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
