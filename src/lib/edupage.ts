import "server-only";

import { decryptSecret } from "./crypto";

/**
 * Klient k vedlejší službě, která mluví s EduPage.
 *
 * Služba běží vedle aplikace v Dockeru a není dostupná zvenčí — proto
 * stačí sdílené tajemství v hlavičce místo plnohodnotné autentizace.
 */

export interface EdupageItem {
  id: string;
  druh: "ukol" | "pisemka" | "akce";
  typ: string | null;
  text: string;
  predmet: string | null;
  termin: string | null;
  zadano: string | null;
  hotovo: boolean;
  autor: string | null;
  navrhKalendare: string | null;
}

export interface EdupageAccountInfo {
  uzivatel: string;
  jeRodic: boolean;
  skolniRok: number;
  subdomena: string | null;
}

export function edupageConfigured(): boolean {
  return Boolean(process.env.EDUPAGE_SIDECAR_URL && process.env.EDUPAGE_SIDECAR_SECRET);
}

interface Credentials {
  email: string;
  heslo: string;
  subdomena?: string | null;
  dite_id?: number | null;
}

async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const base = process.env.EDUPAGE_SIDECAR_URL;
  const secret = process.env.EDUPAGE_SIDECAR_SECRET;

  if (!base || !secret) {
    throw new Error("Propojení s EduPage není na serveru nastavené.");
  }

  let response: Response;
  try {
    response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sidecar-Secret": secret,
      },
      body: JSON.stringify(body),
      // EduPage bývá pomalé; radši delší strop než uříznutý požadavek.
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new Error("Služba pro EduPage neodpovídá. Běží kontejner edupage?");
  }

  const text = await response.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    // Ponecháme null — hlášku poskládáme níž.
  }

  if (!response.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : text.slice(0, 200);
    throw new Error(detail || `EduPage vrátilo chybu ${response.status}.`);
  }

  return data as T;
}

/** Ověří přihlašovací údaje. Používá se při propojování účtu. */
export async function verifyEdupage(creds: Credentials): Promise<EdupageAccountInfo> {
  return call<EdupageAccountInfo>("/overit", { ...creds });
}

/** Stáhne úkoly, písemky a školní akce z timeline. */
export async function fetchEdupageItems(
  creds: Credentials,
  dnuZpet = 30,
): Promise<EdupageItem[]> {
  const data = await call<{ polozky: EdupageItem[] }>("/ukoly", {
    ...creds,
    dnu_zpet: dnuZpet,
  });
  return data.polozky ?? [];
}

/** Poskládá přihlašovací údaje z databázového řádku (heslo je zašifrované). */
export function credentialsFromRow(row: {
  email: string;
  heslo_enc: string;
  subdomena: string | null;
  dite_id: number | null;
}): Credentials {
  return {
    email: row.email,
    heslo: decryptSecret(row.heslo_enc),
    subdomena: row.subdomena,
    dite_id: row.dite_id,
  };
}
