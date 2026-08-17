import "server-only";

import { decryptSecret } from "./crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "openid",
  "email",
].join(" ");

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function googleRedirectUri(): string {
  return `${siteUrl()}/api/google/callback`;
}

/** URL, na kterou uživatele pošleme, aby povolil přístup ke kalendáři. */
export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES,
    // offline + consent zajistí, že dostaneme refresh_token i při opakovaném povolení
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google odmítl výměnu kódu: ${await response.text()}`);
  }
  return response.json();
}

/** Z uloženého (zašifrovaného) refresh tokenu získá čerstvý access token. */
export async function accessTokenFor(encryptedRefreshToken: string): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: decryptSecret(encryptedRefreshToken),
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Nepodařilo se obnovit přístup ke Googlu: ${await response.text()}`);
  }

  const data = (await response.json()) as TokenResponse;
  return data.access_token;
}

/** E-mail účtu, který právě povolil přístup — jen pro zobrazení v nastavení. */
export function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null;
  try {
    const payload = idToken.split(".")[1];
    const json = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    return typeof json.email === "string" ? json.email : null;
  } catch {
    return null;
  }
}

export interface GoogleEventPayload {
  summary: string;
  description?: string;
  location?: string;
  /** Celodenní událost — `YYYY-MM-DD`. */
  startDate?: string;
  endDate?: string;
  /** Časovaná událost — ISO 8601. */
  startDateTime?: string;
  endDateTime?: string;
  timeZone: string;
  colorId?: string;
}

function toGoogleBody(payload: GoogleEventPayload) {
  return {
    summary: payload.summary,
    description: payload.description,
    location: payload.location,
    colorId: payload.colorId,
    start: payload.startDate
      ? { date: payload.startDate }
      : { dateTime: payload.startDateTime, timeZone: payload.timeZone },
    end: payload.endDate
      ? { date: payload.endDate }
      : { dateTime: payload.endDateTime, timeZone: payload.timeZone },
    source: { title: "Rodinný plánovač", url: siteUrl() },
  };
}

export async function insertEvent(
  accessToken: string,
  calendarId: string,
  payload: GoogleEventPayload,
): Promise<string> {
  const response = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(toGoogleBody(payload)),
    },
  );

  if (!response.ok) throw new Error(`Vložení události selhalo: ${await response.text()}`);
  const data = await response.json();
  return data.id as string;
}

export async function updateEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  payload: GoogleEventPayload,
): Promise<void> {
  const response = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(toGoogleBody(payload)),
    },
  );

  // 404/410 = událost už v Googlu není, volající ji vytvoří znovu.
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    throw new Error(`Úprava události selhala: ${await response.text()}`);
  }
  if (response.status === 404 || response.status === 410) {
    throw new GoogleEventMissing();
  }
}

export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
  );
}

export class GoogleEventMissing extends Error {
  constructor() {
    super("Událost v Google kalendáři neexistuje.");
    this.name = "GoogleEventMissing";
  }
}

export async function listCalendars(
  accessToken: string,
): Promise<{ id: string; summary: string; primary?: boolean }[]> {
  const response = await fetch(`${CALENDAR_API}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return [];
  const data = await response.json();
  return (data.items ?? []).map(
    (c: { id: string; summary: string; primary?: boolean }) => ({
      id: c.id,
      summary: c.summary,
      primary: c.primary,
    }),
  );
}
