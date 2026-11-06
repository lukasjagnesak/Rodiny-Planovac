import "server-only";

import { ohlas } from "@/lib/poplach";
import { mailchimpKlient, mailchimpNastaveni, supabaseUloziste } from "./server";
import { zpracujFrontu, type VysledekBehu } from "./synchronizace";

/**
 * Jeden běh fronty s nastavením z `.env`. Volá ho cron každých pět minut
 * a po změně souhlasu i rovnou (přes `after`, aby uživatel nečekal).
 *
 * Dokud není Mailchimp zapnutý, nic se nebere — úlohy zůstávají ve
 * frontě a zpracují se, až se zapne.
 */
export async function behFronty(limit = 50): Promise<VysledekBehu | { vypnuto: string }> {
  const n = mailchimpNastaveni();
  if (!n.nastaveno) return { vypnuto: "chybí MAILCHIMP_API_KEY nebo MAILCHIMP_AUDIENCE_ID" };
  if (!n.zapnuto) return { vypnuto: "MAILCHIMP_ZAPNUTO není 1" };

  const vysledek = await zpracujFrontu(mailchimpKlient(), supabaseUloziste(), {
    doubleOptIn: n.doubleOptIn,
    smazatTrvale: n.smazatTrvale,
    limit,
  });

  if (vysledek.hlaseni.length) {
    await ohlas(vysledek.hlaseni.join("\n"), { kde: "mailchimp/fronta" });
  }
  return vysledek;
}
