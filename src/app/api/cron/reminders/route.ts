import { NextResponse, type NextRequest } from "next/server";
import { dispatchNotifications, planNotifications } from "@/lib/reminders";
import { syncAllCalendars } from "@/lib/google-sync";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Pravidelná údržba — volá se každou hodinu.
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

  report.durationMs = Date.now() - started;
  return NextResponse.json(report);
}

export const POST = GET;
