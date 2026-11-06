/**
 * Příjem webhooků z Mailchimpu (Audience → Settings → Webhooks).
 *
 * Zabezpečení ve dvou vrstvách, obě podle dokumentace Mailchimpu
 * („Sync Audience Data with Webhooks“):
 *
 * 1. Tajný token v URL (`?t=…`). Funguje u každého webhooku, i starého.
 * 2. Podpis `X-Mailchimp-Signature: t={unix},v1={hex}`, HMAC-SHA256
 *    klíčem `signing_secret` nad `"{t}.{surové tělo}"`. Mailchimp ho
 *    ukáže jen jednou při založení webhooku. Když je nastavený
 *    `MAILCHIMP_WEBHOOK_SIGNING_SECRET`, je podpis povinný a starší než
 *    5 minut se odmítá (ochrana proti přehrání).
 *
 * Tělo chodí jako `application/x-www-form-urlencoded` s klíči typu
 * `data[email]`. Podpis se počítá nad surovými bajty, proto se ověřuje
 * dřív, než se tělo rozparsuje.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const TOLERANCE_PODPISU_S = 300;

function stejne(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function tokenSedi(ocekavany: string | undefined, dodany: string | null): boolean {
  if (!ocekavany || !dodany) return false;
  return stejne(ocekavany, dodany);
}

export function podepis(tajemstvi: string, t: number, teloRaw: string): string {
  return createHmac("sha256", tajemstvi).update(`${t}.${teloRaw}`).digest("hex");
}

export type VysledekPodpisu = "ok" | "chybi" | "neplatny" | "stary";

export function overPodpis(
  tajemstvi: string,
  hlavicka: string | null,
  teloRaw: string,
  ted = Date.now(),
): VysledekPodpisu {
  if (!hlavicka) return "chybi";
  const casti = Object.fromEntries(
    hlavicka.split(",").map((c) => {
      const i = c.indexOf("=");
      return [c.slice(0, i).trim(), c.slice(i + 1).trim()];
    }),
  );
  const t = Number(casti.t);
  const v1 = casti.v1;
  if (!Number.isFinite(t) || !v1) return "neplatny";
  if (!stejne(podepis(tajemstvi, t, teloRaw), v1)) return "neplatny";
  if (Math.abs(ted / 1000 - t) > TOLERANCE_PODPISU_S) return "stary";
  return "ok";
}

export type TypUdalosti = "subscribe" | "unsubscribe" | "profile" | "upemail" | "cleaned" | "campaign";

export interface Udalost {
  /** sha256 surového těla — klíč pro deduplikaci opakovaného doručení. */
  klic: string;
  typ: TypUdalosti | string;
  firedAt: Date;
  listId: string;
  /** Adresa kontaktu; u `upemail` ta stará. */
  email: string;
  novyEmail: string | null;
  klidooId: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `fired_at` posílá Mailchimp jako „2009-03-26 21:35:57“ bez časové
 * zóny. Bereme ho jako UTC; slouží jen k řazení událostí jednoho
 * kontaktu, takže případný stálý posun nevadí.
 */
function casUdalosti(text: string | null): Date {
  if (!text) return new Date();
  const d = new Date(`${text.trim().replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export function rozparsuj(teloRaw: string): Udalost | null {
  const p = new URLSearchParams(teloRaw);
  const typ = p.get("type");
  const listId = p.get("data[list_id]") ?? "";
  const email = (p.get("data[email]") ?? p.get("data[old_email]") ?? "").trim().toLowerCase();
  if (!typ || !email) return null;
  const klidooId = p.get("data[merges][KLIDOO_ID]");
  return {
    klic: createHash("sha256").update(teloRaw).digest("hex"),
    typ,
    firedAt: casUdalosti(p.get("fired_at")),
    listId,
    email,
    novyEmail: p.get("data[new_email]")?.trim().toLowerCase() || null,
    klidooId: klidooId && UUID.test(klidooId) ? klidooId : null,
  };
}
