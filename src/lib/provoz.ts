import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "./supabase/admin";

/**
 * Měření provozu.
 *
 * Vlastní, protože web slibuje, že nikoho nesleduje — a u rozvodu to nemá
 * být jen marketingová věta. Neukládá se IP ani nic, čím by šel člověk
 * najít.
 *
 * Otisk návštěvníka je hash z IP, prohlížeče a soli, která se každý den
 * mění: umí odpovědět „kolik lidí", ne „který člověk", a po půlnoci se
 * tentýž návštěvník počítá znovu. Přesně tak, jak to dělá Plausible —
 * a přesně proto na to není potřeba cookie lišta.
 */

export const DRUHY = [
  "zobrazeni",
  "kalkulacka",
  "lead",
  "registrace",
  "rodina",
  "druhy_rodic",
  "predplatne",
] as const;

export type DruhUdalosti = (typeof DRUHY)[number];

export interface Puvod {
  cesta?: string | null;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  ref?: string | null;
}

/** Sůl se mění každý den — bez toho by šel otisk sledovat napříč měsíci. */
function denniSul(): string {
  const zaklad = process.env.PROVOZ_SUL ?? process.env.CRON_SECRET ?? "klidoo";
  return `${zaklad}:${new Date().toISOString().slice(0, 10)}`;
}

export function otiskNavstevnika(ip: string | null, prohlizec: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256")
    .update(`${denniSul()}|${ip}|${prohlizec ?? ""}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Z odkazující adresy nechá jen doménu.
 *
 * Celá adresa by byla užitečnější, jenže u citlivého tématu se v ní občas
 * veze i dotaz, který člověk hledal. Doména odpoví na otázku „odkud
 * chodí lidi" a nic dalšího neprozradí.
 */
export function domenaZdroje(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    const vlastni = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/^https?:\/\//, "");
    if (host && vlastni.startsWith(host)) return null; // proklik po vlastním webu
    return host || null;
  } catch {
    return null;
  }
}

export function zarizeniZProhlizece(ua: string | null): string | null {
  if (!ua) return null;
  return /Mobile|Android|iPhone|iPad/i.test(ua) ? "mobil" : "pocitac";
}

function orez(hodnota: string | null | undefined, max = 200): string | null {
  if (typeof hodnota !== "string") return null;
  const t = hodnota.trim().slice(0, max);
  return t || null;
}

/**
 * Zapíše událost. Nikdy nevyhodí výjimku — měření nesmí shodit akci,
 * kterou měří. Radši budeme mít v grafu díru než rozbitou registraci.
 */
export async function zaznamenej(
  druh: DruhUdalosti | string,
  puvod: Puvod = {},
  navstevnik: string | null = null,
  zarizeni: string | null = null,
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("provoz_udalosti").insert({
      druh: String(druh).slice(0, 40),
      cesta: orez(puvod.cesta, 300),
      zdroj: domenaZdroje(puvod.referrer),
      utm_source: orez(puvod.utm_source, 100),
      utm_medium: orez(puvod.utm_medium, 100),
      utm_campaign: orez(puvod.utm_campaign, 100),
      ref: orez(puvod.ref, 100),
      zarizeni,
      navstevnik,
    });
  } catch (chyba) {
    console.error("[provoz] zápis selhal", chyba);
  }
}

/** Je tenhle e-mail vlastník? Dashboard je jen pro něj. */
export function jeSpravce(email: string | null | undefined): boolean {
  const seznam = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (seznam.length === 0 || !email) return false;
  return seznam.includes(email.trim().toLowerCase());
}
