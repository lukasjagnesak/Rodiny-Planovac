import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "./supabase/admin";
import { novyKod } from "./kod-vypisu";
import type { SessionContext } from "./types";

/**
 * Ověřitelné výpisy (migrace 0034).
 *
 * Výpis dostane kód, který je vytištěný v něm samém, a do databáze se
 * uloží, kdy a kdo ho vytvořil, co obsahoval a u souboru jeho otisk
 * SHA-256. Na klidoo.cz/overit pak kdokoli — soud, OSPOD, advokát
 * druhé strany — zjistí, že výpis vznikl v Klidoo a nikdo ho neupravil.
 *
 * Zapisuje se servisním klíčem: z prohlížeče do tabulky zapsat nejde,
 * jinak by si kdokoli „ověřil" vlastní podvrh. Stažení výpisu se zároveň
 * zapíše do historie rodiny — druhý rodič vidí, kdo a kdy si výpis vzal.
 */

export type DruhVypisu = "komunikace" | "historie" | "souhrn";

const POPIS_DRUHU: Record<DruhVypisu, string> = {
  komunikace: "výpis komunikace",
  historie: "výpis historie změn",
  souhrn: "souhrn péče a nákladů",
};

export function otiskSouboru(soubor: Uint8Array): string {
  return createHash("sha256").update(soubor).digest("hex");
}

/** Věta do výpisu: kde a jak ho ověřit. */
export function vetaOvereni(kod: string, web: string): string {
  return (
    `Ověření pravosti: ${web.replace(/^https?:\/\//, "")}/overit · kód ${kod}. ` +
    "Na stránce zadejte kód a případně nahrajte tento soubor; uvidíte, kdy a kdo výpis " +
    "vytvořil, co obsahoval a zda soubor od vytvoření nikdo neupravil."
  );
}

export async function zaregistrujVypis(args: {
  session: SessionContext;
  kod: string;
  druh: DruhVypisu;
  od?: string | null;
  do?: string | null;
  otisk?: string | null;
  shrnuti: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();
  const jmeno =
    args.session.members.find((m) => m.userId === args.session.userId)?.name ??
    args.session.profile.full_name ??
    "Člen rodiny";

  const { error } = await admin.from("vypisy").insert({
    kod: args.kod,
    family_id: args.session.family.id,
    druh: args.druh,
    vytvoril: args.session.userId,
    vytvoril_jmeno: jmeno,
    obdobi_od: args.od ?? null,
    obdobi_do: args.do ?? null,
    otisk: args.otisk ?? null,
    shrnuti: args.shrnuti,
  });
  if (error) throw new Error(`Výpis se nepodařilo zaregistrovat: ${error.message}`);

  await admin.from("historie").insert({
    family_id: args.session.family.id,
    kdo: args.session.userId,
    kdo_jmeno: jmeno,
    oblast: "vypisy",
    popis: `Stažen ${POPIS_DRUHU[args.druh]} (kód ${args.kod})`,
  });
}

export { novyKod };
