import "server-only";

import nodemailer, { type Transporter } from "nodemailer";
import type { Zprava } from "./mail-sablony";
import { ZNACKA } from "./brand";

/**
 * Odchozí pošta přes SMTP.
 *
 * Proč vlastní SMTP a ne vestavěná pošta Supabase: ta má tvrdý limit
 * pár e-mailů za hodinu a odesílá z cizí domény, takže pozvánky končí
 * ve spamu. Přihlašovací e-maily se přepnou na stejné SMTP v Supabase
 * (Authentication → Emails → SMTP), aby všechno chodilo z klidoo.cz.
 *
 * Poskytovatele nevybíráme natvrdo — nodemailer mluví s čímkoli, co umí
 * SMTP, takže se dá přesedlat změnou proměnných v .env.
 */

let doprava: Transporter | null = null;

export function mailJeNastaveny(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transport(): Transporter {
  if (!doprava) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    doprava = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // 465 je implicitní TLS, 587 začne nešifrovaně a povýší přes STARTTLS.
      secure: port === 465,
      auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
    });
  }
  return doprava;
}

/**
 * Odesílatel se skládá ze dvou proměnných schválně.
 *
 * `SMTP_FROM=Klidoo <info@klidoo.cz>` vypadá pohodlněji, jenže špičaté
 * závorky jsou v shellu přesměrování — `source .env` na takovém řádku
 * skončí syntaktickou chybou a nasazovací skript spadne dřív, než se
 * k něčemu dostane. Uvozovky to neřeší, ty zase vadí Compose.
 */
function odesilatel(): string {
  const jmeno = process.env.SMTP_FROM_NAME?.trim() || ZNACKA;
  const adresa = process.env.SMTP_FROM_EMAIL?.trim() || "info@klidoo.cz";
  return `${jmeno} <${adresa}>`;
}

/**
 * Pošle jeden e-mail. Vrací `false` místo výjimky.
 *
 * Neodeslaný e-mail nesmí shodit akci, která ho vyvolala: když se pozvánka
 * nepošle, odkaz na ni se pořád dá zkopírovat, a to je pořád lepší než
 * chyba nad celým formulářem.
 */
export async function posliMail(komu: string, zprava: Zprava): Promise<boolean> {
  if (!mailJeNastaveny()) {
    console.warn("[mail] SMTP není nastavené, e-mail se neposlal:", zprava.predmet);
    return false;
  }

  try {
    await transport().sendMail({
      from: odesilatel(),
      to: komu,
      subject: zprava.predmet,
      text: zprava.text,
      html: zprava.html,
      replyTo: process.env.SMTP_REPLY_TO || undefined,
    });
    return true;
  } catch (chyba) {
    console.error("[mail] odeslání selhalo:", zprava.predmet, chyba);
    return false;
  }
}

/** Ověření spojení — používá kontrola nastavení, ne běžný provoz. */
export async function overSpojeni(): Promise<{ ok: boolean; chyba?: string }> {
  if (!mailJeNastaveny()) return { ok: false, chyba: "SMTP není nastavené." };
  try {
    await transport().verify();
    return { ok: true };
  } catch (chyba) {
    return { ok: false, chyba: chyba instanceof Error ? chyba.message : "neznámá chyba" };
  }
}
