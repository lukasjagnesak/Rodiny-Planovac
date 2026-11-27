/**
 * Content-Security-Policy — co smí prohlížeč na stránce spustit a kam
 * smí stránka posílat data.
 *
 * Dvě úrovně, protože dvě různé části webu:
 *
 * **Aplikace** (všechno, kde jsou data rodiny) má přísnou politiku
 * s jednorázovým `nonce`. Spustí se jen skript, který dostal kód od
 * serveru u téhož požadavku, a skripty, které takový skript sám načte
 * (`strict-dynamic`). Vložený cizí kód — třeba přes zprávu od druhého
 * rodiče, kdyby se někde zapomnělo na escapování — neběží. Data smějí
 * odcházet jen na náš server a do Supabase.
 *
 * **Veřejný web** je předgenerovaný (rychlost, vyhledávače, reklama)
 * a nonce do předem hotové stránky dát nejde — jeden by platil pro
 * všechny návštěvníky a nebyl by k ničemu. Tam je seznam povolených
 * adres: náš server, Google a Meta pro měření, nic dalšího. Dat rodiny
 * se veřejný web nedotýká.
 *
 * Dva vlastní vložené skripty v kořenovém layoutu (téma, instalace) se
 * v aplikaci povolují otiskem (`sha256-…`), ne nonce — layout by jinak
 * musel číst hlavičky a celý web by přestal být předgenerovaný.
 */

export interface VolbyCsp {
  /** Jednorázový kód pro přísnou politiku. Bez něj vznikne politika webu. */
  nonce?: string | null;
  /** Otisky vlastních vložených skriptů, `sha256-…` bez uvozovek. */
  otisky?: string[];
  /** `NEXT_PUBLIC_SUPABASE_URL`. */
  supabase?: string | null;
  vyvoj?: boolean;
}

/** Měření Googlu (GA4, Ads) a Mety. Jen pro veřejný web. */
const MERENI = {
  skripty: [
    "https://www.googletagmanager.com",
    "https://googleads.g.doubleclick.net",
    "https://www.googleadservices.com",
    "https://connect.facebook.net",
  ],
  spojeni: [
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://*.googletagmanager.com",
    "https://www.google.com",
    "https://googleads.g.doubleclick.net",
    "https://www.googleadservices.com",
    "https://www.facebook.com",
    "https://connect.facebook.net",
  ],
  obrazky: [
    "https://*.google-analytics.com",
    "https://*.googletagmanager.com",
    "https://www.google.com",
    "https://www.google.cz",
    "https://googleads.g.doubleclick.net",
    "https://www.facebook.com",
  ],
  ramy: ["https://td.doubleclick.net", "https://www.googletagmanager.com"],
};

function puvodSupabase(adresa: string | null | undefined): { https: string; wss: string } | null {
  if (!adresa) return null;
  try {
    const url = new URL(adresa.trim());
    return { https: url.origin, wss: `${url.protocol === "http:" ? "ws" : "wss"}://${url.host}` };
  } catch {
    return null;
  }
}

export function sestavCsp({ nonce, otisky = [], supabase, vyvoj = false }: VolbyCsp): string {
  const prisna = Boolean(nonce);
  const sb = puvodSupabase(supabase);
  const supabaseZdroje = sb ? [sb.https, sb.wss] : [];

  // V aplikaci se do `script-src` nesmí přidat `'unsafe-inline'` ani
  // adresy: s `strict-dynamic` je prohlížeč stejně ignoruje a jen by
  // mátly toho, kdo to čte. React ve vývoji potřebuje `eval`.
  const skripty = prisna
    ? [`'nonce-${nonce}'`, ...otisky.map((o) => `'${o}'`), "'strict-dynamic'"]
    : ["'self'", "'unsafe-inline'", ...MERENI.skripty];
  if (vyvoj) skripty.push("'unsafe-eval'");

  const spojeni = ["'self'", ...supabaseZdroje, ...(prisna ? [] : MERENI.spojeni)];
  if (vyvoj) spojeni.push("ws:");

  const obrazky = [
    "'self'",
    "data:",
    "blob:",
    ...(sb ? [sb.https] : []),
    // Profilová fotka z přihlášení přes Google.
    "https://*.googleusercontent.com",
    ...(prisna ? [] : MERENI.obrazky),
  ];

  const pravidla: [string, string[]][] = [
    ["default-src", ["'self'"]],
    ["script-src", skripty],
    // Inline `style` u prvků (barvy dětí, pruhy) — bez toho by se
    // aplikace rozpadla. Styly samy nic spustit ani odeslat neumí.
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", obrazky],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", spojeni],
    ["media-src", ["'self'", "blob:", ...(sb ? [sb.https] : [])]],
    ["frame-src", prisna ? ["'self'"] : ["'self'", ...MERENI.ramy]],
    ["worker-src", ["'self'"]],
    ["manifest-src", ["'self'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'self'"]],
  ];

  const text = pravidla.map(([k, v]) => `${k} ${v.join(" ")}`);
  if (!vyvoj) text.push("upgrade-insecure-requests");
  return text.join("; ");
}

/** Jednorázový kód: 16 náhodných bajtů v base64. */
export function novyNonce(): string {
  const bajty = crypto.getRandomValues(new Uint8Array(16));
  let s = "";
  for (const b of bajty) s += String.fromCharCode(b);
  return btoa(s);
}

/** `sha256-…` otisk textu vloženého skriptu, přesně jak ho chce CSP. */
export async function otiskSkriptu(text: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  let s = "";
  for (const b of new Uint8Array(hash)) s += String.fromCharCode(b);
  return `sha256-${btoa(s)}`;
}
