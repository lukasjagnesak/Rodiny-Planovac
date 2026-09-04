import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sběr kontaktů z veřejného webu.
 *
 * Stejná pojistka proti zaplavení jako u kalkulačky: v paměti procesu,
 * po restartu zapomene. Na veřejný formulář to stačí, není za čím se
 * schovat a nechci kvůli tomu tahat další službu.
 */
const POKUSY = new Map<string, { pocet: number; od: number }>();
const OKNO_MS = 60 * 60 * 1000;
const MAX_ZA_HODINU = 15;

function prekrocilLimit(ip: string): boolean {
  const ted = Date.now();
  const zaznam = POKUSY.get(ip);

  if (!zaznam || ted - zaznam.od > OKNO_MS) {
    POKUSY.set(ip, { pocet: 1, od: ted });
    return false;
  }

  zaznam.pocet += 1;

  if (POKUSY.size > 5000) {
    for (const [klic, hodnota] of POKUSY) {
      if (ted - hodnota.od > OKNO_MS) POKUSY.delete(klic);
    }
  }

  return zaznam.pocet > MAX_ZA_HODINU;
}

function text(hodnota: unknown, maxDelka: number): string | null {
  if (typeof hodnota !== "string") return null;
  const orezano = hodnota.trim().slice(0, maxDelka);
  return orezano || null;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "neznámá";

  if (prekrocilLimit(ip)) {
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

  return NextResponse.json({ ok: true });
}
