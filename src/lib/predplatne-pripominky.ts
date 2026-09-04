import "server-only";

import { createAdminClient } from "./supabase/admin";
import { posliMail, mailJeNastaveny } from "./mail";
import { konecZkusebnihoZprava, platbaSelhalaZprava } from "./mail-sablony";
import { siteUrl } from "./google";

/**
 * E-maily kolem předplatného: konec zkušebního období a neúspěšná platba.
 *
 * Posílá se nanejvýš jednou denně na rodinu — cron běží každou hodinu
 * a nic není jistější cesta do spamové složky než dvacet stejných zpráv.
 * Upomínáme dvakrát: tři dny předem a poslední den. Víc už je otravování.
 */

/** Kolik dní před koncem zkušebního období upozorňujeme. */
const UPOZORNIT_DNI = [3, 1];

const DEN = 24 * 60 * 60 * 1000;

interface Vysledek {
  zkusebni: number;
  poSplatnosti: number;
  preskoceno: number;
}

export async function posliPripominkyPredplatneho(): Promise<Vysledek> {
  const vysledek: Vysledek = { zkusebni: 0, poSplatnosti: 0, preskoceno: 0 };

  if (!mailJeNastaveny()) {
    vysledek.preskoceno = -1;
    return vysledek;
  }

  const admin = createAdminClient();
  const dnes = new Date().toISOString().slice(0, 10);

  const { data: predplatna } = await admin
    .from("predplatna")
    .select("family_id, stav, plati_do, pripominka_poslana")
    .in("stav", ["zkusebni", "po_splatnosti"]);

  for (const p of predplatna ?? []) {
    if (p.pripominka_poslana === dnes) {
      vysledek.preskoceno += 1;
      continue;
    }

    const dni = Math.ceil((new Date(p.plati_do as string).getTime() - Date.now()) / DEN);
    const jeZkusebni = p.stav === "zkusebni";

    if (jeZkusebni && !UPOZORNIT_DNI.includes(dni)) continue;

    const prijemci = await spravciRodiny(p.family_id as string);
    if (prijemci.length === 0) continue;

    const odkaz = `${siteUrl()}/predplatne`;
    let poslano = false;

    for (const prijemce of prijemci) {
      const zprava = jeZkusebni
        ? konecZkusebnihoZprava({ jmeno: prijemce.jmeno, dni, odkaz })
        : platbaSelhalaZprava({ odkaz });
      if (await posliMail(prijemce.email, zprava)) poslano = true;
    }

    if (!poslano) continue;

    await admin
      .from("predplatna")
      .update({ pripominka_poslana: dnes })
      .eq("family_id", p.family_id);

    if (jeZkusebni) vysledek.zkusebni += 1;
    else vysledek.poSplatnosti += 1;
  }

  return vysledek;
}

/**
 * Komu psát. Jen role, které s předplatným můžou něco udělat — dítěti
 * ani babičce s přístupem na čtení nemá cenu psát o platbě.
 */
async function spravciRodiny(
  familyId: string,
): Promise<{ email: string; jmeno: string }[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("family_members")
    .select("role, profile:profiles(email, full_name)")
    .eq("family_id", familyId)
    .in("role", ["owner", "parent"]);

  const prijemci: { email: string; jmeno: string }[] = [];

  for (const clen of data ?? []) {
    const profil = clen.profile as unknown as { email: string | null; full_name: string | null } | null;
    if (profil?.email) {
      prijemci.push({ email: profil.email, jmeno: profil.full_name ?? "" });
    }
  }

  return prijemci;
}
