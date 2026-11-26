import "server-only";

import { createAdminClient } from "./supabase/admin";
import { ohlasNovyKontakt } from "./spravce-oznameni";
import { MARKETING_SOUHLAS } from "./marketing-souhlas";

/**
 * Uložení kontaktu z veřejného webu.
 *
 * Sdílí to formulář na materiály i odeslání výpočtu výživného. Kdyby
 * si každý zapisoval po svém, rozjede se to na drobnostech — jednou se
 * zapomene ohlásit nový kontakt, jinde se duplicita vrátí jako chyba.
 */

export interface LeadVstup {
  email: string;
  magnet: string;
  jmeno?: string | null;
  organizace?: string | null;
  telefon?: string | null;
  zprava?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  ref?: string | null;
  referrer?: string | null;
  landing?: string | null;
  /** Zaškrtnutý marketingový souhlas; verze se doplní sama. */
  marketing_consent?: boolean;
}

export type VysledekUlozeni = "ulozeno" | "duplicita" | "chyba";

export async function ulozLead(vstup: LeadVstup): Promise<VysledekUlozeni> {
  const admin = createAdminClient();

  // Obyčejný insert, ne upsert: unikátní index sedí na `lower(email)`,
  // což `on conflict` neumí pojmenovat sloupci. Duplicitu proto necháme
  // vzniknout a odchytíme ji.
  // Souhlas zpracuje trigger `klidoo_marketing_lead` v Supabase: s touto
  // verzí zavolá `marketing_request` a Mailchimp pošle potvrzení odběru.
  const souhlas = vstup.marketing_consent === true;
  const { error } = await admin.from("leady").insert({
    ...vstup,
    marketing_consent: souhlas,
    marketing_consent_version: souhlas ? MARKETING_SOUHLAS.verze : null,
  });

  if (error) {
    // Druhé odeslání stejného e-mailu na stejný materiál není chyba
    // uživatele — nejspíš mu první zpráva utekla. Když ale tentokrát
    // zaškrtl souhlas, trigger se nespustí (řádek nevznikl), takže ho
    // zapíšeme přímo. Odhlášeného funkce sama přeskočí.
    if (error.code === "23505") {
      if (souhlas) {
        await admin.rpc("marketing_request", {
          address: vstup.email,
          origin_source: "web-form",
          version_text: MARKETING_SOUHLAS.verze,
          consent_text: MARKETING_SOUHLAS.text,
        });
      }
      return "duplicita";
    }
    return "chyba";
  }

  // Správci do telefonu. Bez `await`, protože návštěvník nemá čekat na
  // odeslání notifikace, aby dostal svůj materiál.
  void ohlasNovyKontakt({
    email: vstup.email,
    magnet: vstup.magnet,
    jmeno: vstup.jmeno ?? null,
    organizace: vstup.organizace ?? null,
  }).catch(() => {});

  return "ulozeno";
}
