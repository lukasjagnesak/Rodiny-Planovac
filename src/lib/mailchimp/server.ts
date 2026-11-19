import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { vytvorKlienta, type Mailchimp, type StavClena } from "./klient";
import type { StavKontaktu, Uloha, Uloziste, ZmenaKontaktu } from "./synchronizace";

/**
 * Nastavení z `.env` na serveru. Nic z toho nesmí mít prefix
 * `NEXT_PUBLIC_` — klíč by se zapekl do JavaScriptu v prohlížeči.
 *
 * Dvě úrovně vypínače:
 * - bez `MAILCHIMP_API_KEY` a `MAILCHIMP_AUDIENCE_ID` se nedělá nic;
 * - bez `MAILCHIMP_ZAPNUTO=1` se smí jen číst (dry-run migrace).
 *   Úlohy se mezitím hromadí ve frontě a po zapnutí se zpracují.
 */
export function mailchimpNastaveni() {
  const apiKlic = process.env.MAILCHIMP_API_KEY?.trim() ?? "";
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID?.trim() ?? "";
  return {
    nastaveno: Boolean(apiKlic && audienceId),
    zapnuto: process.env.MAILCHIMP_ZAPNUTO === "1",
    apiKlic,
    audienceId,
    doubleOptIn: process.env.MAILCHIMP_DOUBLE_OPT_IN !== "0",
    smazatTrvale: process.env.MAILCHIMP_SMAZANI !== "archivovat",
    webhookToken: process.env.MAILCHIMP_WEBHOOK_TOKEN?.trim() || undefined,
    webhookPodpis: process.env.MAILCHIMP_WEBHOOK_SIGNING_SECRET?.trim() || undefined,
  };
}

export function mailchimpKlient(): Mailchimp {
  const n = mailchimpNastaveni();
  return vytvorKlienta({ apiKlic: n.apiKlic, audienceId: n.audienceId });
}

type Radek = Record<string, unknown>;
const t = (v: unknown) => (v == null ? null : String(v));

export function stavZRadku(j: Radek): StavKontaktu {
  return {
    userId: String(j.user_id),
    email: t(j.email),
    jmeno: t(j.jmeno),
    registrace: t(j.registrace),
    premium: Boolean(j.premium),
    souhlas: Boolean(j.souhlas),
    souhlasAt: t(j.souhlas_at),
    odvolanoAt: t(j.odvolano_at),
    zdroj: t(j.zdroj),
    mcStatus: (t(j.mc_status) as StavClena | null) ?? null,
    mcEmail: t(j.mc_email),
    mcOdhlasenoAt: t(j.mc_odhlaseno_at),
    uctEmailSync: t(j.ucet_email_sync),
    welcomeAt: t(j.welcome_at),
  };
}

function naUlohu(r: Radek): Uloha {
  return {
    id: Number(r.id),
    userId: t(r.user_id),
    druh: r.druh === "smazat" ? "smazat" : "sync",
    mcEmail: t(r.mc_email),
    pokusy: Number(r.pokusy ?? 0),
  };
}

/** Úložiště nad Supabase se servisním klíčem. */
export function supabaseUloziste(): Uloziste {
  const db = createAdminClient();

  const over = (kde: string, error: { message: string } | null) => {
    if (error) throw new Error(`${kde}: ${error.message}`);
  };

  return {
    async vezmiUlohy(limit) {
      const { data, error } = await db.rpc("marketing_fronta_vezmi", { p_limit: limit });
      over("fronta", error);
      return ((data ?? []) as Radek[]).map(naUlohu);
    },

    async nactiStav(userId) {
      const { data, error } = await db.rpc("marketing_stav", { p_user: userId });
      over("stav", error);
      return data ? stavZRadku(data as Radek) : null;
    },

    async ulozKontakt(userId, z: ZmenaKontaktu) {
      const zmena: Radek = {};
      if (z.mcStatus !== undefined) {
        zmena.mc_status = z.mcStatus;
        zmena.mc_status_at = new Date().toISOString();
      }
      if (z.mcEmail !== undefined) zmena.mc_email = z.mcEmail;
      if (z.uctEmailSync !== undefined) zmena.ucet_email_sync = z.uctEmailSync;
      if (z.posledniChyba !== undefined) zmena.posledni_chyba = z.posledniChyba;
      if (z.synchronizovano) zmena.posledni_sync_at = new Date().toISOString();

      if (z.odhlasenoVMailchimpu) {
        // Odhlášení, o kterém webhook neřekl: souhlas v Klidoo končí taky,
        // jinak by ho příští úprava profilu brala jako platný.
        const { data: k } = await db
          .from("marketing_kontakty")
          .select("souhlas")
          .eq("user_id", userId)
          .maybeSingle();
        zmena.mc_odhlaseno_at = z.odhlasenoVMailchimpu;
        zmena.mc_status = "unsubscribed";
        zmena.mc_status_at = new Date().toISOString();
        if (k?.souhlas) {
          zmena.souhlas = false;
          zmena.odvolano_at = new Date().toISOString();
          const { error } = await db.from("marketing_souhlasy_historie").insert({
            user_id: userId,
            udalost: "odhlasen_v_mailchimpu",
            zdroj: "rekonciliace",
          });
          over("historie", error);
        }
      }

      if (Object.keys(zmena).length === 0) return;
      const { error } = await db.from("marketing_kontakty").update(zmena).eq("user_id", userId);
      over("kontakt", error);
    },

    async zaberUvitani(userId) {
      const { data, error } = await db.rpc("marketing_zaber_uvitani", { p_user: userId });
      over("uvitani", error);
      return Boolean(data);
    },

    async uvolniUvitani(userId) {
      await db.from("marketing_kontakty").update({ welcome_at: null }).eq("user_id", userId);
    },

    async hotovo(u) {
      const { error } = await db
        .from("marketing_fronta")
        // Adresa u výmazu už není potřeba — neschovávat ji ve frontě.
        .update({ stav: "hotovo", hotovo_at: new Date().toISOString(), mc_email: null, posledni_chyba: null })
        .eq("id", u.id);
      over("hotovo", error);
    },

    async odloz(u, chyba, zaMs) {
      const { error } = await db
        .from("marketing_fronta")
        .update({
          stav: "ceka",
          zamceno_at: null,
          dalsi_pokus_at: new Date(Date.now() + zaMs).toISOString(),
          posledni_chyba: chyba.slice(0, 300),
        })
        .eq("id", u.id);
      // Druhá čekající úloha téhož uživatele mezitím vznikla — tahle je zbytečná.
      if (error?.code === "23505") {
        await db.from("marketing_fronta").update({ stav: "hotovo", hotovo_at: new Date().toISOString() }).eq("id", u.id);
        return;
      }
      over("odloz", error);
    },

    async vzdej(u, chyba) {
      const { error } = await db
        .from("marketing_fronta")
        .update({ stav: "vzdano", zamceno_at: null, posledni_chyba: chyba.slice(0, 300) })
        .eq("id", u.id);
      over("vzdej", error);
    },
  };
}
