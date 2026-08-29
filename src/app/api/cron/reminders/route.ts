import { NextResponse, type NextRequest } from "next/server";
import { dispatchNotifications, planNotifications } from "@/lib/reminders";
import { syncAllCalendars } from "@/lib/google-sync";
import { INTERVAL_HODIN, stahniZmeskane } from "@/lib/edupage-sync";
import { posliPripominkyPredplatneho } from "@/lib/predplatne-pripominky";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Pravidelná údržba — volá se každou hodinu.
 *
 * Připomínky se plánují a rozesílají pokaždé. Google kalendář se
 * synchronizuje také každou hodinu, EduPage po třech — každá část si
 * hlídá vlastní interval, protože cron je jen jeden.
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://…/api/cron/reminders
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  }

  const started = Date.now();
  const report: Record<string, unknown> = {};

  try {
    report.planned = await planNotifications();
  } catch (e) {
    report.planError = e instanceof Error ? e.message : String(e);
  }

  try {
    report.dispatch = await dispatchNotifications();
  } catch (e) {
    report.dispatchError = e instanceof Error ? e.message : String(e);
  }

  // Google synchronizace je nejdražší část — pouštíme ji jen jednou za hodinu.
  if (request.nextUrl.searchParams.get("google") !== "0") {
    try {
      report.google = await syncAllCalendars();
    } catch (e) {
      report.googleError = e instanceof Error ? e.message : String(e);
    }
  }

  // EduPage se stahuje po třech hodinách, ne každou. Škola nepřidává
  // úkoly každou hodinu a přihlašování napodobuje mobilní aplikaci —
  // není důvod na ni chodit častěji, než má smysl.
  if (request.nextUrl.searchParams.get("edupage") !== "0") {
    try {
      report.edupage = await stahniZmeskane();
      report.edupageIntervalHodin = INTERVAL_HODIN;
    } catch (e) {
      report.edupageError = e instanceof Error ? e.message : String(e);
    }
  }

  // Konec zkušebního období a neúspěšné platby. Nanejvýš jeden e-mail
  // na rodinu za den — o to se stará sama funkce.
  if (request.nextUrl.searchParams.get("predplatne") !== "0") {
    try {
      report.predplatne = await posliPripominkyPredplatneho();
    } catch (e) {
      report.predplatneError = e instanceof Error ? e.message : String(e);
    }
  }

  report.durationMs = Date.now() - started;
  return NextResponse.json(report);
}

export const POST = GET;
