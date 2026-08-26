import "server-only";

import { createAdminClient } from "./supabase/admin";
import { credentialsFromRow } from "./edupage";

export interface EdupageParovani {
  edupage_id: number;
  child_id: string;
  family_id: string;
  jmeno: string | null;
}

export interface EdupageKontext {
  ucet: { email: string; heslo_enc: string; subdomena: string | null; je_rodic: boolean };
  parovani: EdupageParovani[];
  /** Přihlašovací údaje včetně dětí, na které se má účet přepínat. */
  creds: ReturnType<typeof credentialsFromRow>;
}

/**
 * Načte propojený účet i to, která dětí se z něj mají stahovat.
 *
 * Bez spárovaného dítěte se nestahuje nic — nemělo by se to kam uložit
 * a hlavně by se pak nedalo poznat, komu úkol patří.
 */
export async function nactiEdupageKontext(
  userId: string,
): Promise<{ kontext: EdupageKontext | null; chyba: string | null }> {
  const admin = createAdminClient();

  const { data: ucet } = await admin
    .from("edupage_accounts")
    .select("email, heslo_enc, subdomena, je_rodic")
    .eq("user_id", userId)
    .maybeSingle();

  if (!ucet) return { kontext: null, chyba: "EduPage není propojené." };

  const { data: radky } = await admin
    .from("edupage_deti")
    .select("edupage_id, child_id, jmeno, children (id, family_id)")
    .eq("user_id", userId)
    .not("child_id", "is", null);

  const parovani: EdupageParovani[] = (radky ?? [])
    .map((r) => {
      const dite = r.children as unknown as { id: string; family_id: string } | null;
      if (!dite) return null;
      return {
        edupage_id: r.edupage_id as number,
        child_id: dite.id,
        family_id: dite.family_id,
        jmeno: (r.jmeno as string | null) ?? null,
      };
    })
    .filter((r): r is EdupageParovani => r !== null);

  // Žákovský účet žádné přepínání nepotřebuje — stahuje sám sebe.
  if (ucet.je_rodic && parovani.length === 0) {
    return {
      kontext: null,
      chyba: "Nemáš spárované žádné dítě. Nastav to v Nastavení → EduPage.",
    };
  }

  return {
    kontext: {
      ucet,
      parovani,
      creds: credentialsFromRow(
        ucet,
        parovani.map((p) => p.edupage_id),
      ),
    },
    chyba: null,
  };
}

/** Zapíše výsledek stahování k účtu, ať je v nastavení vidět, jak dopadlo. */
export async function zapisVysledek(userId: string, chyba: string | null): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("edupage_accounts")
    .update(
      chyba === null
        ? { last_sync_at: new Date().toISOString(), last_sync_error: null }
        : { last_sync_error: chyba.slice(0, 400) },
    )
    .eq("user_id", userId);
}
