import { NextResponse, after, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mailchimpNastaveni } from "@/lib/mailchimp/server";
import { overPodpis, rozparsuj, tokenSedi } from "@/lib/mailchimp/webhook";
import { behFronty } from "@/lib/mailchimp/beh";
import { ohlas } from "@/lib/poplach";

export const dynamic = "force-dynamic";

/**
 * Webhook z Mailchimpu: odhlášení, nedoručitelnost, změna adresy
 * a potvrzení double opt-in.
 *
 * Odpovídá rychle (Mailchimp čeká nejvýš 10 s). Neplatný požadavek
 * dostane 401 bez vysvětlení; Mailchimp ho nebude opakovat donekonečna.
 * Chyba u nás vrátí 500 — Mailchimp to zkusí znovu a deduplikace
 * v databázi zajistí, že se nic nezpracuje dvakrát.
 */

/** Mailchimp při zakládání webhooku ověřuje adresu požadavkem GET. */
export async function GET(request: NextRequest) {
  const n = mailchimpNastaveni();
  if (!tokenSedi(n.webhookToken, request.nextUrl.searchParams.get("t"))) {
    return new NextResponse(null, { status: 401 });
  }
  return new NextResponse("ok", { status: 200 });
}

export async function POST(request: NextRequest) {
  const n = mailchimpNastaveni();

  // Bez tokenu v .env webhook vůbec nepřijímáme — jinak by byl otevřený.
  if (!tokenSedi(n.webhookToken, request.nextUrl.searchParams.get("t"))) {
    return new NextResponse(null, { status: 401 });
  }

  const teloRaw = await request.text();
  if (teloRaw.length > 64 * 1024) return new NextResponse(null, { status: 413 });

  if (n.webhookPodpis) {
    const podpis = overPodpis(n.webhookPodpis, request.headers.get("x-mailchimp-signature"), teloRaw);
    if (podpis !== "ok") return new NextResponse(null, { status: 401 });
  }

  const udalost = rozparsuj(teloRaw);
  if (!udalost) return NextResponse.json({ ok: true, vysledek: "nerozpoznano" });
  if (n.audienceId && udalost.listId !== n.audienceId) {
    return NextResponse.json({ ok: true, vysledek: "jina-audience" });
  }
  if (!["subscribe", "unsubscribe", "cleaned", "upemail"].includes(udalost.typ)) {
    return NextResponse.json({ ok: true, vysledek: "ignorovano" });
  }

  const db = createAdminClient();
  const { data, error } = await db.rpc("marketing_mailchimp_udalost", {
    p_klic: udalost.klic,
    p_typ: udalost.typ,
    p_email: udalost.email,
    p_novy_email: udalost.novyEmail,
    p_fired_at: udalost.firedAt.toISOString(),
    p_klidoo_id: udalost.klidooId,
  });

  if (error) {
    await ohlas(error.message, { kde: "mailchimp/webhook", detaily: { typ: udalost.typ } });
    return new NextResponse(null, { status: 500 });
  }

  // Odhlášení z Mailchimpu platí i pro naše vlastní obchodní e-maily
  // (sekvence pro kontakty z webu). Provozní zprávy chodí dál.
  if (udalost.typ === "unsubscribe" && data === "odhlaseno") {
    await db.from("mail_odhlaseni").upsert({ email: udalost.email, duvod: "mailchimp" }, { onConflict: "email" });
  }

  // Potvrzený double opt-in → uvítání co nejdřív, ne až s cronem.
  if (data === "prihlaseno") after(() => behFronty(5).then(() => undefined).catch(() => undefined));

  return NextResponse.json({ ok: true, vysledek: data });
}
