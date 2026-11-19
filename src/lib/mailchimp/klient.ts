/**
 * Tenký klient Mailchimp Marketing API v3.
 *
 * Jen to, co integrace potřebuje, nic víc. `fetch` se dá podstrčit,
 * takže testy běží proti simulátoru a nikdy nesáhnou na skutečnou
 * Audience (a nikomu nepošlou e-mail).
 *
 * Klíč se do logů ani chyb nedostane: chyba nese jen HTTP stav
 * a `title`/`detail` z odpovědi Mailchimpu.
 */

import { createHash } from "node:crypto";

export type StavClena =
  | "subscribed"
  | "unsubscribed"
  | "cleaned"
  | "pending"
  | "transactional"
  | "archived";

export interface Clen {
  email: string;
  status: StavClena;
  /** Kdy se naposledy změnil stav nebo údaje (ISO). */
  lastChanged: string | null;
  tagy: string[];
}

export interface TeloUpsertu {
  /** Stav jen pro nový kontakt. Existující kontakt nezmění. */
  status_if_new?: StavClena;
  /** Stav vždy. Posílá se jen tam, kde ho opravdu měnit chceme. */
  status?: StavClena;
  merge_fields?: Record<string, string>;
}

export interface Tag {
  name: string;
  status: "active" | "inactive";
}

export interface Mailchimp {
  nactiClena(email: string): Promise<Clen | null>;
  upsert(email: string, telo: TeloUpsertu): Promise<Clen>;
  zmenEmail(stary: string, novy: string): Promise<Clen>;
  odhlas(email: string): Promise<void>;
  nastavTagy(email: string, tagy: Tag[]): Promise<void>;
  smaz(email: string, trvale: boolean): Promise<void>;
}

/** Chyba z API. `docasna` = má smysl to zkusit znovu. */
export class MailchimpChyba extends Error {
  constructor(
    public readonly status: number,
    public readonly titulek: string,
    detail: string,
  ) {
    super(`Mailchimp ${status}: ${titulek}${detail ? ` — ${detail}` : ""}`);
    this.name = "MailchimpChyba";
  }
  /** 429, 5xx a výpadek sítě (status 0). */
  get docasna(): boolean {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
  /** Chybný nebo zrušený klíč, chybějící oprávnění. */
  get autorizace(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

/** Mailchimp identifikuje člena MD5 hashem adresy malými písmeny. */
export function hashClena(email: string): string {
  return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}

/** Datacentrum je přípona klíče: `…-us21` → `us21`. */
export function datacentrum(apiKlic: string): string {
  const dc = apiKlic.split("-").pop() ?? "";
  if (!/^[a-z]+\d+$/.test(dc)) throw new Error("API klíč Mailchimpu nemá platnou příponu datacentra.");
  return dc;
}

interface Nastaveni {
  apiKlic: string;
  audienceId: string;
  fetch?: typeof fetch;
  /** Limit na jeden požadavek. Mailchimp občas odpovídá dlouho. */
  timeoutMs?: number;
}

type Odpoved = Record<string, unknown>;

function naClena(data: Odpoved): Clen {
  const tagy = Array.isArray(data.tags)
    ? (data.tags as { name?: unknown }[]).map((t) => String(t.name ?? ""))
    : [];
  return {
    email: String(data.email_address ?? "").toLowerCase(),
    status: String(data.status) as StavClena,
    lastChanged: typeof data.last_changed === "string" ? data.last_changed : null,
    tagy,
  };
}

export function vytvorKlienta(nastaveni: Nastaveni): Mailchimp {
  const zaklad = `https://${datacentrum(nastaveni.apiKlic)}.api.mailchimp.com/3.0/lists/${encodeURIComponent(nastaveni.audienceId)}`;
  const f = nastaveni.fetch ?? fetch;
  const timeoutMs = nastaveni.timeoutMs ?? 15000;
  const autorizace = `Basic ${Buffer.from(`klidoo:${nastaveni.apiKlic}`).toString("base64")}`;

  async function volej(metoda: string, cesta: string, telo?: unknown): Promise<Odpoved | null> {
    let odpoved: Response;
    try {
      odpoved = await f(`${zaklad}${cesta}`, {
        method: metoda,
        headers: { Authorization: autorizace, "Content-Type": "application/json" },
        body: telo === undefined ? undefined : JSON.stringify(telo),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      throw new MailchimpChyba(0, "Síťová chyba", e instanceof Error ? e.name : "");
    }
    if (odpoved.status === 204) return null;
    const text = await odpoved.text();
    let data: Odpoved = {};
    try {
      data = text ? (JSON.parse(text) as Odpoved) : {};
    } catch {
      data = {};
    }
    if (!odpoved.ok) {
      throw new MailchimpChyba(
        odpoved.status,
        String(data.title ?? odpoved.statusText ?? "Chyba"),
        String(data.detail ?? "").slice(0, 300),
      );
    }
    return data;
  }

  const clen = (email: string) => `/members/${hashClena(email)}`;

  return {
    async nactiClena(email) {
      try {
        const data = await volej("GET", `${clen(email)}?fields=email_address,status,last_changed,tags`);
        return data ? naClena(data) : null;
      } catch (e) {
        if (e instanceof MailchimpChyba && e.status === 404) return null;
        throw e;
      }
    },

    async upsert(email, telo) {
      const data = await volej("PUT", clen(email), { email_address: email, ...telo });
      return naClena(data ?? {});
    },

    async zmenEmail(stary, novy) {
      const data = await volej("PATCH", clen(stary), { email_address: novy });
      return naClena(data ?? {});
    },

    async odhlas(email) {
      try {
        await volej("PATCH", clen(email), { status: "unsubscribed" });
      } catch (e) {
        // Kdo v Audience není, ten se odhlašovat nemusí.
        if (e instanceof MailchimpChyba && e.status === 404) return;
        throw e;
      }
    },

    async nastavTagy(email, tagy) {
      // is_syncing: false — přidání tagu SMÍ spustit automatizaci.
      // Tím se spouští uvítací sekvence.
      await volej("POST", `${clen(email)}/tags`, { tags: tagy, is_syncing: false });
    },

    async smaz(email, trvale) {
      try {
        if (trvale) await volej("POST", `${clen(email)}/actions/delete-permanent`);
        else await volej("DELETE", clen(email));
      } catch (e) {
        if (e instanceof MailchimpChyba && e.status === 404) return;
        throw e;
      }
    },
  };
}
