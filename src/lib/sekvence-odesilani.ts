import "server-only";

import { createAdminClient } from "./supabase/admin";
import { posliMail, mailJeNastaveny } from "./mail";
import { dikVzorDohodyZprava } from "./mail-sablony";
import { odhlasovaciOdkaz } from "./odhlaseni";
import { siteUrl } from "./google";
import { ohlas } from "./poplach";
import {
  jeVOkne,
  krokKOdeslani,
  sekvenceProMagnet,
  type Sekvence,
} from "./sekvence";

/**
 * Rozeslání e-mailových sekvencí. Volá to hodinový cron.
 *
 * Definice sekvencí jsou tady, protože obsahují šablony, které umí jen
 * server. Rozhodování o tom, co komu poslat, je v `sekvence.ts` bez
 * závislosti na poště i databázi — a proto se dá otestovat.
 */

export const SEKVENCE: Sekvence[] = [
  {
    klic: "vzor-dohody",
    // Volný text stejně jako u `leady.magnet`. Kdyby se materiál
    // přejmenoval, sekvence se tiše zastaví — proto se nová jména
    // přidávají sem, ne že se ta stará přepíšou.
    magnety: ["vzor-dohody"],
    kroky: [
      {
        klic: "dik",
        // Hned. Poděkování, které dorazí za tři dny, je zpráva
        // odjinud — člověk už dávno neví, co si stahoval.
        poHodinach: 0,
        zprava: (v) => dikVzorDohodyZprava({ web: v.web, odhlaseni: v.odhlaseni }),
      },
    ],
  },
];

export interface VysledekSekvenci {
  odeslano: number;
  preskoceno: number;
  chyby: number;
}

/** Kolik zpráv se rozešle v jednom běhu. Pojistka proti nechtěné lavině. */
const NEJVIC_ZA_BEH = 100;

export async function posliSekvence(): Promise<VysledekSekvenci> {
  const vysledek: VysledekSekvenci = { odeslano: 0, preskoceno: 0, chyby: 0 };

  if (!mailJeNastaveny()) {
    vysledek.preskoceno = -1;
    return vysledek;
  }

  const admin = createAdminClient();
  const ted = new Date();
  const web = siteUrl();

  const magnety = SEKVENCE.flatMap((s) => s.magnety);
  if (magnety.length === 0) return vysledek;

  // Bere se jen okno, ve kterém sekvence vůbec může běžet. Bez toho by
  // se při každém běhu procházel celý archiv kontaktů.
  const odKdy = new Date(ted.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString();

  const { data: leady } = await admin
    .from("leady")
    .select("id, email, magnet, created_at")
    .in("magnet", magnety)
    .gte("created_at", odKdy)
    .order("created_at", { ascending: true })
    .limit(500);

  if (!leady || leady.length === 0) return vysledek;

  const { data: odhlaseni } = await admin.from("mail_odhlaseni").select("email");
  const odhlaseneAdresy = new Set((odhlaseni ?? []).map((o) => String(o.email)));

  const { data: uzPoslane } = await admin
    .from("lead_sekvence_kroky")
    .select("lead_id, sekvence, krok")
    .in("lead_id", leady.map((l) => l.id as string));

  const historie = new Map<string, string[]>();
  for (const z of uzPoslane ?? []) {
    const klic = `${z.lead_id}|${z.sekvence}`;
    historie.set(klic, [...(historie.get(klic) ?? []), String(z.krok)]);
  }

  for (const lead of leady) {
    if (vysledek.odeslano >= NEJVIC_ZA_BEH) break;

    const email = String(lead.email);
    if (odhlaseneAdresy.has(email.trim().toLowerCase())) {
      vysledek.preskoceno += 1;
      continue;
    }

    const sekvence = sekvenceProMagnet(String(lead.magnet), SEKVENCE);
    if (!sekvence) continue;

    const prihlaseno = new Date(String(lead.created_at));
    if (!jeVOkne(prihlaseno, ted)) {
      vysledek.preskoceno += 1;
      continue;
    }

    const krok = krokKOdeslani(
      sekvence,
      prihlaseno,
      ted,
      historie.get(`${lead.id}|${sekvence.klic}`) ?? [],
    );
    if (!krok) continue;

    // Zápis PŘED odesláním. Kdyby to bylo obráceně a zápis selhal,
    // dostane člověk tutéž zprávu při každém dalším běhu cronu. Když
    // naopak selže odeslání, značka se pod tím zase smaže a příště se
    // to zkusí znovu — jednou nedoručený e-mail je menší škoda než
    // deset doručených.
    const { error: chybaZapisu } = await admin.from("lead_sekvence_kroky").insert({
      lead_id: lead.id,
      sekvence: sekvence.klic,
      krok: krok.klic,
    });

    // 23505 = souběžný běh cronu byl rychlejší. Není to chyba, jen
    // důkaz, že pojistka v databázi funguje.
    if (chybaZapisu) {
      if (chybaZapisu.code !== "23505") vysledek.chyby += 1;
      vysledek.preskoceno += 1;
      continue;
    }

    const zprava = krok.zprava({ web, odhlaseni: odhlasovaciOdkaz(web, email) });
    const poslano = await posliMail(email, zprava);

    if (poslano) {
      vysledek.odeslano += 1;
    } else {
      vysledek.chyby += 1;
      await admin
        .from("lead_sekvence_kroky")
        .delete()
        .eq("lead_id", lead.id)
        .eq("sekvence", sekvence.klic)
        .eq("krok", krok.klic);
    }
  }

  if (vysledek.chyby > 0) {
    await ohlas(new Error(`Sekvence: ${vysledek.chyby} zpráv se nepodařilo odeslat`), {
      kde: "mail/sekvence",
      detaily: { ...vysledek },
    });
  }

  return vysledek;
}
