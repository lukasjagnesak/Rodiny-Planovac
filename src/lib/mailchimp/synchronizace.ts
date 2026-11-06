/**
 * Synchronizace marketingových kontaktů do Mailchimpu.
 *
 * Tenhle soubor nezná databázi ani `fetch` — dostane úložiště a klienta
 * přes rozhraní. Díky tomu se celé chování (odhlášení, double opt-in,
 * jedno uvítání, výpadky, rate limit) testuje bez sítě a bez rizika,
 * že test pošle e-mail skutečnému člověku.
 *
 * Základní pravidla:
 *
 * 1. Úloha nečte „co se změnilo“, ale aktuální stav. Deset změn = jedna
 *    synchronizace se stejným výsledkem. Opakování je bezpečné.
 * 2. Existující kontakt nikdy nedostane `status: subscribed` jen proto,
 *    že se změnil profil. Nový kontakt dostane stav přes `status_if_new`.
 * 3. `unsubscribed` a `cleaned` v Mailchimpu se respektují. Znovu se
 *    přihlásit jde jen novým souhlasem v Klidoo, a i pak jen přes
 *    potvrzovací e-mail (`pending`), nikdy rovnou.
 * 4. Uvítací tag dostane kontakt nejvýš jednou, a jen když je opravdu
 *    `subscribed` (po potvrzení double opt-in).
 */

import { MailchimpChyba, type Clen, type Mailchimp, type StavClena, type Tag } from "./klient";

export const TAGY = {
  registrovany: "klidoo_registered",
  uvitani: "klidoo_welcome",
  aktivni: "klidoo_active",
  neaktivni: "klidoo_inactive",
  premium: "klidoo_premium",
} as const;

export interface StavKontaktu {
  userId: string;
  /** E-mail účtu (auth.users), malými písmeny. */
  email: string | null;
  jmeno: string | null;
  registrace: string | null;
  premium: boolean;
  souhlas: boolean;
  souhlasAt: string | null;
  odvolanoAt: string | null;
  zdroj: string | null;
  mcStatus: StavClena | null;
  mcEmail: string | null;
  mcOdhlasenoAt: string | null;
  uctEmailSync: string | null;
  welcomeAt: string | null;
}

export interface Uloha {
  id: number;
  userId: string | null;
  druh: "sync" | "smazat";
  mcEmail: string | null;
  pokusy: number;
}

export interface ZmenaKontaktu {
  mcStatus?: StavClena | null;
  mcEmail?: string | null;
  uctEmailSync?: string | null;
  posledniChyba?: string | null;
  synchronizovano?: boolean;
  /** Odhlášení zjištěné při synchronizaci (webhook nedorazil). */
  odhlasenoVMailchimpu?: string;
}

export interface Uloziste {
  vezmiUlohy(limit: number): Promise<Uloha[]>;
  nactiStav(userId: string): Promise<StavKontaktu | null>;
  ulozKontakt(userId: string, zmena: ZmenaKontaktu): Promise<void>;
  zaberUvitani(userId: string): Promise<boolean>;
  uvolniUvitani(userId: string): Promise<void>;
  hotovo(uloha: Uloha): Promise<void>;
  odloz(uloha: Uloha, chyba: string, zaMs: number): Promise<void>;
  vzdej(uloha: Uloha, chyba: string): Promise<void>;
}

export interface NastaveniSync {
  /** Nový kontakt nejdřív dostane potvrzovací e-mail (pending). */
  doubleOptIn: boolean;
  /** Při smazání účtu trvalý výmaz (GDPR), jinak archivace. */
  smazatTrvale: boolean;
  /** Kolik úloh za jeden běh. */
  limit?: number;
  /** Po kolika pokusech úlohu vzdát. */
  maxPokusu?: number;
}

export interface VysledekBehu {
  zpracovano: number;
  hotovo: number;
  odlozeno: number;
  vzdano: number;
  /** Proč běh skončil dřív (rate limit, klíč). */
  preruseno: string | null;
  /** Chyby, které má vidět správce (bez osobních údajů). */
  hlaseni: string[];
}

const MINUTA = 60 * 1000;

/** Exponenciální odstup: 1, 2, 4, 8 … minut, nejvýš 6 hodin. */
export function odstup(pokusy: number): number {
  return Math.min(2 ** Math.max(0, pokusy - 1) * MINUTA, 6 * 60 * MINUTA);
}

/** FNAME = první slovo jména. Celé jméno Mailchimp k ničemu nepotřebuje. */
export function krestni(jmeno: string | null): string {
  return (jmeno ?? "").trim().split(/\s+/)[0]?.slice(0, 50) ?? "";
}

function mergeFields(stav: StavKontaktu): Record<string, string> {
  return {
    FNAME: krestni(stav.jmeno),
    KLIDOO_ID: stav.userId,
    REGDATE: (stav.registrace ?? "").slice(0, 10),
    SOURCE: (stav.zdroj ?? "klidoo").slice(0, 40),
  };
}

const cas = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : 0);

export type Akce =
  | { druh: "nic"; duvod: string }
  | { druh: "odhlasit" }
  | { druh: "zapsat"; telo: { status_if_new?: StavClena; status?: StavClena } }
  | { druh: "respektovat-odhlaseni" };

/**
 * Co udělat s kontaktem. Čistá funkce — jádro celé integrace.
 */
export function rozhodni(stav: StavKontaktu, clen: Clen | null, doubleOptIn: boolean): Akce {
  const novyStav: StavClena = doubleOptIn ? "pending" : "subscribed";

  if (!stav.souhlas) {
    // Odhlašujeme jen to, co u nás člověk odvolal POTOM, co se v Mailchimpu
    // naposledy něco změnilo. Kdo se přihlásil přímo u Mailchimpu, toho
    // naše chybějící souhlas neodhlásí.
    if (clen && (clen.status === "subscribed" || clen.status === "pending")) {
      if (stav.odvolanoAt && cas(stav.odvolanoAt) >= cas(clen.lastChanged)) return { druh: "odhlasit" };
      return { druh: "nic", duvod: "prihlasen-mimo-klidoo" };
    }
    return { druh: "nic", duvod: "bez-souhlasu" };
  }

  if (!clen) return { druh: "zapsat", telo: { status_if_new: novyStav } };

  switch (clen.status) {
    case "subscribed":
    case "pending":
      // Jen údaje. Bez `status` — existujícímu kontaktu stav neměníme.
      return { druh: "zapsat", telo: {} };
    case "cleaned":
      return { druh: "nic", duvod: "cleaned" };
    case "unsubscribed":
      // Nový souhlas v Klidoo po odhlášení v Mailchimpu → znovu, ale
      // jen přes potvrzovací e-mail. Mailchimp přímé `subscribed`
      // u odhlášeného kontaktu stejně odmítne („compliance state“).
      if (cas(stav.souhlasAt) > Math.max(cas(clen.lastChanged), cas(stav.mcOdhlasenoAt))) {
        return { druh: "zapsat", telo: { status: "pending" } };
      }
      return { druh: "respektovat-odhlaseni" };
    case "archived":
    case "transactional":
      // Kontakt existuje, ale není v marketingu; `status_if_new` by se
      // neuplatnil. Souhlas máme, takže stav nastavíme výslovně.
      return { druh: "zapsat", telo: { status: novyStav } };
    default:
      return { druh: "nic", duvod: "neznamy-stav" };
  }
}

async function synchronizuj(
  mc: Mailchimp,
  ul: Uloziste,
  stav: StavKontaktu,
  nastaveni: NastaveniSync,
): Promise<void> {
  if (!stav.email) throw new MailchimpChyba(400, "Účet nemá e-mail", "");
  const ucet = stav.email.toLowerCase();
  let adresa = (stav.mcEmail ?? ucet).toLowerCase();

  // Změna e-mailu v Klidoo (ne v Mailchimpu): přesunout kontakt na novou adresu.
  if (stav.mcEmail && stav.uctEmailSync && stav.uctEmailSync !== ucet && adresa !== ucet) {
    const stary = await mc.nactiClena(adresa);
    if (stary && (stary.status === "subscribed" || stary.status === "pending") && stav.souhlas) {
      try {
        await mc.zmenEmail(adresa, ucet);
      } catch (e) {
        // Nová adresa už v Audience je jako jiný kontakt. Starý odhlásíme,
        // aby nechodilo dvakrát, a dál se řídí stav nové adresy.
        if (!(e instanceof MailchimpChyba) || e.status !== 400) throw e;
        await mc.odhlas(adresa);
      }
    }
    adresa = ucet;
  }

  const clen = await mc.nactiClena(adresa);
  const akce = rozhodni(stav, clen, nastaveni.doubleOptIn);
  let vysledny: StavClena | null = clen?.status ?? null;
  let tagyClena = clen?.tagy ?? [];

  if (akce.druh === "odhlasit") {
    await mc.odhlas(adresa);
    vysledny = "unsubscribed";
  } else if (akce.druh === "respektovat-odhlaseni") {
    // Webhook o odhlášení nedorazil — dorovnáme souhlas v Klidoo.
    await ul.ulozKontakt(stav.userId, {
      odhlasenoVMailchimpu: clen?.lastChanged ?? new Date().toISOString(),
    });
    vysledny = "unsubscribed";
  } else if (akce.druh === "zapsat") {
    const zapsany = await mc.upsert(adresa, { ...akce.telo, merge_fields: mergeFields(stav) });
    vysledny = zapsany.status;
    tagyClena = zapsany.tagy.length ? zapsany.tagy : tagyClena;
  }

  if (stav.souhlas && vysledny === "subscribed") {
    const tagy: Tag[] = [
      { name: TAGY.registrovany, status: "active" },
      { name: TAGY.premium, status: stav.premium ? "active" : "inactive" },
    ];
    await mc.nastavTagy(adresa, tagy);

    // Uvítání jednou. Pojistka dvakrát: záznam v DB (zabírá se dřív, než
    // se volá API) a tag, který už kontakt v Mailchimpu má.
    if (!stav.welcomeAt && !tagyClena.includes(TAGY.uvitani)) {
      if (await ul.zaberUvitani(stav.userId)) {
        try {
          await mc.nastavTagy(adresa, [{ name: TAGY.uvitani, status: "active" }]);
        } catch (e) {
          await ul.uvolniUvitani(stav.userId);
          throw e;
        }
      }
    }
  }

  await ul.ulozKontakt(stav.userId, {
    mcStatus: vysledny,
    mcEmail: vysledny ? adresa : stav.mcEmail,
    uctEmailSync: ucet,
    posledniChyba: null,
    synchronizovano: true,
  });
}

/**
 * Jeden běh workeru: vezme úlohy z fronty a zpracuje je postupně.
 *
 * Postupně, ne paralelně. Mailchimp dovolí nejvýš 10 souběžných spojení
 * na účet a fronta za pět minut stejně nikdy nebude dlouhá.
 */
export async function zpracujFrontu(
  mc: Mailchimp,
  ul: Uloziste,
  nastaveni: NastaveniSync,
): Promise<VysledekBehu> {
  const vysledek: VysledekBehu = {
    zpracovano: 0,
    hotovo: 0,
    odlozeno: 0,
    vzdano: 0,
    preruseno: null,
    hlaseni: [],
  };
  const maxPokusu = nastaveni.maxPokusu ?? 8;
  const ulohy = await ul.vezmiUlohy(nastaveni.limit ?? 50);

  for (let i = 0; i < ulohy.length; i++) {
    const uloha = ulohy[i];

    // Po přerušení (rate limit, klíč) se zbylé úlohy vrátí do fronty bez
    // započítání pokusu navíc — nic se s nimi nestalo.
    if (vysledek.preruseno) {
      await ul.odloz(uloha, vysledek.preruseno, MINUTA);
      vysledek.odlozeno += 1;
      continue;
    }

    vysledek.zpracovano += 1;
    try {
      if (uloha.druh === "smazat") {
        if (uloha.mcEmail) await mc.smaz(uloha.mcEmail, nastaveni.smazatTrvale);
      } else if (uloha.userId) {
        const stav = await ul.nactiStav(uloha.userId);
        // Účet mezitím zmizel — o výmaz se postará úloha „smazat“.
        if (stav) await synchronizuj(mc, ul, stav, nastaveni);
      }
      await ul.hotovo(uloha);
      vysledek.hotovo += 1;
    } catch (e) {
      const chyba = e instanceof MailchimpChyba ? e : null;
      const popis = chyba ? chyba.message : e instanceof Error ? e.message : String(e);

      if (chyba?.autorizace) {
        vysledek.preruseno = "Mailchimp odmítl API klíč";
        vysledek.hlaseni.push(`Mailchimp odmítl API klíč (${chyba.status}). Synchronizace stojí.`);
        await ul.odloz(uloha, popis, odstup(uloha.pokusy));
        vysledek.odlozeno += 1;
        continue;
      }

      if (chyba && !chyba.docasna) {
        // Trvalá chyba (neplatná adresa, kontakt trvale smazaný v Mailchimpu…).
        // Opakování nepomůže.
        if (uloha.userId) await ul.ulozKontakt(uloha.userId, { posledniChyba: popis.slice(0, 300) });
        await ul.vzdej(uloha, popis);
        vysledek.vzdano += 1;
        continue;
      }

      if (uloha.pokusy >= maxPokusu) {
        if (uloha.userId) await ul.ulozKontakt(uloha.userId, { posledniChyba: popis.slice(0, 300) });
        await ul.vzdej(uloha, popis);
        vysledek.vzdano += 1;
        vysledek.hlaseni.push(`Úloha ${uloha.id} vzdána po ${uloha.pokusy} pokusech: ${popis.slice(0, 200)}`);
        continue;
      }

      await ul.odloz(uloha, popis, odstup(uloha.pokusy));
      vysledek.odlozeno += 1;
      if (chyba?.status === 429) vysledek.preruseno = "Mailchimp rate limit";
    }
  }

  return vysledek;
}

export interface VysledekMigrace {
  dryRun: boolean;
  zpusobilych: number;
  novych: number;
  existujicich: number;
  preskoceno: { odhlaseno: number; cleaned: number; bezEmailu: number };
  chyb: number;
  zarazeno: number;
}

/**
 * Jednorázová migrace: projde kontakty s doloženým souhlasem
 * a zjistí, co se s nimi stane. V režimu dry-run jen čte (GET)
 * a nic nezapisuje ani v Mailchimpu, ani v databázi.
 *
 * Ostrý běh nic neposílá sám — zařadí kontakty do fronty a zbytek
 * udělá běžný worker se všemi pojistkami. Opakované spuštění proto
 * nic nezduplikuje.
 */
export async function migrace(
  mc: Mailchimp,
  kontakty: StavKontaktu[],
  dryRun: boolean,
  zarad: (userId: string) => Promise<void>,
): Promise<VysledekMigrace> {
  const v: VysledekMigrace = {
    dryRun,
    zpusobilych: 0,
    novych: 0,
    existujicich: 0,
    preskoceno: { odhlaseno: 0, cleaned: 0, bezEmailu: 0 },
    chyb: 0,
    zarazeno: 0,
  };

  for (const k of kontakty) {
    if (!k.souhlas) continue;
    if (!k.email) {
      v.preskoceno.bezEmailu += 1;
      continue;
    }
    try {
      const clen = await mc.nactiClena(k.mcEmail ?? k.email);
      const akce = rozhodni(k, clen, true);
      if (akce.druh === "respektovat-odhlaseni") {
        v.preskoceno.odhlaseno += 1;
        continue;
      }
      if (akce.druh === "nic" && akce.duvod === "cleaned") {
        v.preskoceno.cleaned += 1;
        continue;
      }
      v.zpusobilych += 1;
      if (clen) v.existujicich += 1;
      else v.novych += 1;
      if (!dryRun) {
        await zarad(k.userId);
        v.zarazeno += 1;
      }
    } catch {
      v.chyb += 1;
    }
  }
  return v;
}
