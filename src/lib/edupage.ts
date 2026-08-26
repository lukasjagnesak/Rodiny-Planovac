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
  diteId: number | null;
  druh: "ukol" | "pisemka" | "zprava" | "akce";
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
  /** ID dětí v EduPage, mezi kterými se má účet přepínat. */
  deti?: number[];
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
    throw new Error(
      "Služba pro EduPage neodpovídá. Zkontroluj, jestli běží — v Dockeru " +
        "kontejner `edupage`, lokálně uvicorn na portu 8000.",
    );
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

/** Stáhne úkoly, písemky, zprávy a školní akce z timeline. */
export async function fetchEdupageItems(
  creds: Credentials,
  dnuZpet = 30,
): Promise<{ polozky: EdupageItem[]; chyby: string[] }> {
  const data = await call<{ polozky: EdupageItem[]; chyby: string[] }>("/ukoly", {
    ...creds,
    dnu_zpet: dnuZpet,
  });
  return { polozky: data.polozky ?? [], chyby: data.chyby ?? [] };
}

export interface EdupageDiteInfo {
  edupageId: number;
  jmeno: string | null;
  kde?: string;
}

/**
 * Děti, které rodičovský účet vidí.
 *
 * Vrací i názvy klíčů v přihlašovacích datech — když se nic nenajde, je
 * podle čeho hledání doladit, místo hádání naslepo.
 */
export async function fetchEdupageDeti(creds: Credentials): Promise<{
  jeRodic: boolean;
  deti: EdupageDiteInfo[];
  klice: string[];
  /** Když hledání spadlo — vrací se i tak, aby bylo co opravovat. */
  potize: string | null;
}> {
  const data = await call<{
    jeRodic: boolean;
    deti: EdupageDiteInfo[];
    klice: string[];
    potize: string | null;
  }>("/deti", { ...creds });

  return {
    jeRodic: data.jeRodic,
    deti: data.deti ?? [],
    klice: data.klice ?? [],
    potize: data.potize ?? null,
  };
}

export interface EdupageLesson {
  diteId: number | null;
  den: number;
  datum: string;
  tyden: number;
  poradi: number;
  predmet: string;
  ucebna: string | null;
  ucitel: string | null;
  zacatek: string;
  konec: string;
  zruseno: boolean;
  akce: boolean;
}

/** Stáhne rozvrh na následující dny — den po dni, tak jak ho EduPage vydává. */
export async function fetchEdupageRozvrh(
  creds: Credentials,
  dnuDopredu = 14,
): Promise<{ hodiny: EdupageLesson[]; dnu: number; chyby: string[] }> {
  const data = await call<{ hodiny: EdupageLesson[]; dnu: number; chyby: string[] }>("/rozvrh", {
    ...creds,
    dnu_dopredu: dnuDopredu,
  });
  return { hodiny: data.hodiny ?? [], dnu: data.dnu ?? 0, chyby: data.chyby ?? [] };
}

/** Poskládá přihlašovací údaje z databázového řádku (heslo je zašifrované). */
export function credentialsFromRow(
  row: { email: string; heslo_enc: string; subdomena: string | null },
  deti: number[] = [],
): Credentials {
  return {
    email: row.email,
    heslo: decryptSecret(row.heslo_enc),
    subdomena: row.subdomena,
    deti,
  };
}
