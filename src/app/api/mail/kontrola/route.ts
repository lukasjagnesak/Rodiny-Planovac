import { NextResponse, type NextRequest } from "next/server";
import { mailJeNastaveny, overSpojeni, posliMail } from "@/lib/mail";
import { konecZkusebnihoZprava } from "@/lib/mail-sablony";
import { siteUrl } from "@/lib/google";

export const dynamic = "force-dynamic";

/**
 * Kontrola SMTP po nasazení. Chráněná stejným tajemstvím jako cron,
 * protože jinak by šla použít k rozesílání.
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://klidoo.cz/api/mail/kontrola
 *   …?komu=ja@example.cz   → pošle na tu adresu zkušební zprávu
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  }

  const nastaveno = mailJeNastaveny();
  const spojeni = await overSpojeni();

  const komu = request.nextUrl.searchParams.get("komu");
  let poslano: boolean | null = null;

  if (komu && spojeni.ok) {
    poslano = await posliMail(
      komu,
      konecZkusebnihoZprava({ jmeno: "", dni: 3, odkaz: `${siteUrl()}/predplatne` }),
    );
  }

  return NextResponse.json({
    nastaveno,
    host: process.env.SMTP_HOST ?? null,
    odesilatel: process.env.SMTP_FROM_EMAIL ?? null,
    spojeni,
    poslano,
  });
}
