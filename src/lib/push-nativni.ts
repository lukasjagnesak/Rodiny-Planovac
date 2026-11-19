/**
 * Push notifikace do aplikací z obchodů: Apple (APNs) a Android (FCM).
 *
 * Web Push uvnitř aplikace pro iPhone nefunguje, proto vlastní kanál.
 * Záměrně bez SDK Firebase a bez knihoven pro APNs — obojí jsou dva
 * HTTP požadavky s podepsaným JWT, který umí `node:crypto`. O balíček
 * méně, který může zestárnout.
 *
 * Tokeny zařízení leží ve stejné tabulce jako webové odběry
 * (`push_subscriptions.endpoint` = `apns:<token>` / `fcm:<token>`),
 * takže všechna místa, která posílají notifikace, fungují beze změny.
 *
 * Tenhle soubor nezávisí na `server-only` ani na `fetch` z prostředí —
 * dostává ho parametrem, aby šel otestovat bez sítě.
 */

import { createSign, createPrivateKey, sign as podepis } from "node:crypto";
import { connect, type ClientHttp2Session } from "node:http2";

export interface NativniZprava {
  titulek: string;
  telo: string;
  odkaz: string;
  tag?: string;
}

export type VysledekNativni = { ok: boolean; gone?: boolean; chyba?: string };

const b64u = (v: Buffer | string) => Buffer.from(v).toString("base64url");

// ── APNs ──────────────────────────────────────────────────────────────

export interface ApnsNastaveni {
  /** Obsah souboru AuthKey_XXXX.p8 (s řádky BEGIN/END). */
  klic: string;
  klicId: string;
  teamId: string;
  bundleId: string;
  sandbox: boolean;
}

export function apnsNastaveniZProstredi(env = process.env): ApnsNastaveni | null {
  const klic = env.APNS_KLIC_P8_BASE64 ? Buffer.from(env.APNS_KLIC_P8_BASE64, "base64").toString("utf8") : "";
  if (!klic || !env.APNS_KLIC_ID || !env.APNS_TEAM_ID) return null;
  return {
    klic,
    klicId: env.APNS_KLIC_ID,
    teamId: env.APNS_TEAM_ID,
    bundleId: env.APNS_BUNDLE_ID || "cz.klidoo.app",
    sandbox: env.APNS_SANDBOX === "1",
  };
}

let apnsJwt: { token: string; vznik: number } | null = null;

/** JWT pro APNs (ES256). Apple chce nový nejdřív po 20 minutách, nejpozději po hodině. */
export function apnsToken(n: ApnsNastaveni, ted = Date.now()): string {
  if (apnsJwt && ted - apnsJwt.vznik < 40 * 60 * 1000) return apnsJwt.token;
  const hlavicka = b64u(JSON.stringify({ alg: "ES256", kid: n.klicId }));
  const obsah = b64u(JSON.stringify({ iss: n.teamId, iat: Math.floor(ted / 1000) }));
  const vstup = `${hlavicka}.${obsah}`;
  const podpis = podepis("sha256", Buffer.from(vstup), {
    key: createPrivateKey(n.klic),
    dsaEncoding: "ieee-p1363",
  });
  apnsJwt = { token: `${vstup}.${b64u(podpis)}`, vznik: ted };
  return apnsJwt.token;
}

export function apnsTelo(z: NativniZprava): string {
  return JSON.stringify({
    aps: {
      alert: { title: z.titulek, body: z.telo },
      sound: "default",
      ...(z.tag ? { "thread-id": z.tag } : {}),
    },
    odkaz: z.odkaz,
  });
}

let apnsSpojeni: { session: ClientHttp2Session; host: string } | null = null;

function spojeniApns(host: string): ClientHttp2Session {
  if (apnsSpojeni && apnsSpojeni.host === host && !apnsSpojeni.session.closed && !apnsSpojeni.session.destroyed) {
    return apnsSpojeni.session;
  }
  const session = connect(`https://${host}`);
  session.on("error", () => {
    apnsSpojeni = null;
  });
  session.unref();
  apnsSpojeni = { session, host };
  return session;
}

/** Odešle notifikaci přes APNs (HTTP/2). */
export async function posliApns(
  n: ApnsNastaveni,
  token: string,
  z: NativniZprava,
): Promise<VysledekNativni> {
  const host = n.sandbox ? "api.sandbox.push.apple.com" : "api.push.apple.com";
  try {
    const session = spojeniApns(host);
    const { status, telo } = await new Promise<{ status: number; telo: string }>((resolve, reject) => {
      const req = session.request({
        ":method": "POST",
        ":path": `/3/device/${encodeURIComponent(token)}`,
        authorization: `bearer ${apnsToken(n)}`,
        "apns-topic": n.bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      });
      let status = 0;
      let telo = "";
      req.setTimeout(10000, () => req.close());
      req.on("response", (h) => {
        status = Number(h[":status"] ?? 0);
      });
      req.on("data", (c) => {
        telo += c;
      });
      req.on("end", () => resolve({ status, telo }));
      req.on("error", reject);
      req.end(apnsTelo(z));
    });
    return vyhodnotApns(status, telo);
  } catch (e) {
    apnsSpojeni = null;
    return { ok: false, chyba: e instanceof Error ? e.message : "APNs nedostupné." };
  }
}

export function vyhodnotApns(status: number, telo: string): VysledekNativni {
  if (status === 200) return { ok: true };
  let duvod = "";
  try {
    duvod = String((JSON.parse(telo) as { reason?: string }).reason ?? "");
  } catch {
    duvod = "";
  }
  // 410 = aplikace odinstalovaná; BadDeviceToken = token z jiného
  // prostředí nebo neplatný. Obojí: odběr smazat.
  if (status === 410 || duvod === "BadDeviceToken" || duvod === "Unregistered") {
    return { ok: false, gone: true, chyba: `APNs: ${duvod || status}` };
  }
  return { ok: false, chyba: `APNs ${status}: ${duvod}` };
}

// ── FCM (Android) ────────────────────────────────────────────────────

export interface FcmNastaveni {
  projekt: string;
  email: string;
  klic: string;
}

export function fcmNastaveniZProstredi(env = process.env): FcmNastaveni | null {
  if (!env.FCM_SERVICE_ACCOUNT_BASE64) return null;
  try {
    const ucet = JSON.parse(Buffer.from(env.FCM_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8")) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    if (!ucet.project_id || !ucet.client_email || !ucet.private_key) return null;
    return { projekt: ucet.project_id, email: ucet.client_email, klic: ucet.private_key };
  } catch {
    return null;
  }
}

let fcmPristup: { token: string; plati: number } | null = null;

export function fcmZadostOToken(n: FcmNastaveni, ted = Date.now()): string {
  const iat = Math.floor(ted / 1000);
  const hlavicka = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const obsah = b64u(
    JSON.stringify({
      iss: n.email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat,
      exp: iat + 3600,
    }),
  );
  const podpis = createSign("RSA-SHA256").update(`${hlavicka}.${obsah}`).sign(n.klic);
  return `${hlavicka}.${obsah}.${b64u(podpis)}`;
}

async function fcmToken(n: FcmNastaveni, f: typeof fetch): Promise<string> {
  if (fcmPristup && fcmPristup.plati > Date.now() + 60_000) return fcmPristup.token;
  const odpoved = await f("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: fcmZadostOToken(n),
    }),
    signal: AbortSignal.timeout(10000),
  });
  const data = (await odpoved.json()) as { access_token?: string; expires_in?: number };
  if (!odpoved.ok || !data.access_token) throw new Error(`FCM přihlášení selhalo (${odpoved.status}).`);
  fcmPristup = { token: data.access_token, plati: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return fcmPristup.token;
}

export function fcmTelo(token: string, z: NativniZprava) {
  return {
    message: {
      token,
      notification: { title: z.titulek, body: z.telo },
      data: { odkaz: z.odkaz, ...(z.tag ? { tag: z.tag } : {}) },
      android: {
        priority: "HIGH",
        notification: { color: "#2c8671", ...(z.tag ? { tag: z.tag } : {}) },
      },
    },
  };
}

/** Odešle notifikaci přes FCM HTTP v1. */
export async function posliFcm(
  n: FcmNastaveni,
  token: string,
  z: NativniZprava,
  f: typeof fetch = fetch,
): Promise<VysledekNativni> {
  try {
    const pristup = await fcmToken(n, f);
    const odpoved = await f(`https://fcm.googleapis.com/v1/projects/${n.projekt}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${pristup}`, "Content-Type": "application/json" },
      body: JSON.stringify(fcmTelo(token, z)),
      signal: AbortSignal.timeout(10000),
    });
    if (odpoved.ok) return { ok: true };
    const data = (await odpoved.json().catch(() => ({}))) as {
      error?: { status?: string; details?: { errorCode?: string }[] };
    };
    const kod = data.error?.details?.find((d) => d.errorCode)?.errorCode ?? data.error?.status ?? "";
    // UNREGISTERED = aplikace odinstalovaná nebo token obnovený.
    if (odpoved.status === 404 || kod === "UNREGISTERED") {
      return { ok: false, gone: true, chyba: `FCM: ${kod || odpoved.status}` };
    }
    if (odpoved.status === 401) fcmPristup = null;
    return { ok: false, chyba: `FCM ${odpoved.status}: ${kod}` };
  } catch (e) {
    return { ok: false, chyba: e instanceof Error ? e.message : "FCM nedostupné." };
  }
}

// ── Rozcestník podle uloženého odběru ───────────────────────────────

export type DruhOdberu = "web" | "apns" | "fcm";

export function druhOdberu(endpoint: string): { druh: DruhOdberu; token: string } {
  if (endpoint.startsWith("apns:")) return { druh: "apns", token: endpoint.slice(5) };
  if (endpoint.startsWith("fcm:")) return { druh: "fcm", token: endpoint.slice(4) };
  return { druh: "web", token: endpoint };
}

/** Token od zařízení: jen znaky, které APNs (hex) a FCM (base64url, `:`) používají. */
export function platnyToken(platforma: unknown, token: unknown): token is string {
  if (typeof token !== "string" || token.length < 32 || token.length > 4096) return false;
  if (platforma === "ios") return /^[0-9a-fA-F]{64,200}$/.test(token);
  if (platforma === "android") return /^[A-Za-z0-9_:\-]+$/.test(token);
  return false;
}
