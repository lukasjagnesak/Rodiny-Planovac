/**
 * Text marketingového souhlasu.
 *
 * Musí přesně sedět s tím, co zapisují funkce integrace s Mailchimpem
 * v Supabase (`public.marketing_request`, verze `klidoo-email-2026-11-06`).
 * Ty jinou verzi odmítnou a do auditu ukládají tento text — člověk proto
 * musí vidět právě ho. Nová formulace = nová verze v databázi i tady.
 */
export const MARKETING_SOUHLAS = {
  verze: "klidoo-email-2026-11-06",
  text: "Chci dostávat e-mailem novinky a nabídky Klidoo. Souhlas mohu kdykoli odvolat.",
} as const;

/**
 * Souhlas s vánočními tipy (vánoční plánovač). Úzký rozsah: 5 tipů do
 * 23. 12., ne obecné novinky — kontakty s touto verzí se nesmí dostat
 * do jiných kampaní bez nového souhlasu. Databáze ji přijímá od úpravy
 * docs/integrations/sql/2026-11-27_souhlas_vanocni_tipy.sql.
 */
export const VANOCNI_TIPY_SOUHLAS = {
  verze: "klidoo-vanoce-tipy-2026-11",
  zvyraznene: "Pošlete mi i 5 krátkých tipů,",
  text: "Pošlete mi i 5 krátkých tipů, jak zvládnout Vánoce ve dvou domovech (do 23. 12.). Odhlásit se jde jedním klikem.",
} as const;

export const SOUHLASY = [MARKETING_SOUHLAS, VANOCNI_TIPY_SOUHLAS] as const;

/** Text k verzi, nebo `null` pro neznámou verzi. */
export function textSouhlasu(verze: unknown): string | null {
  return SOUHLASY.find((s) => s.verze === verze)?.text ?? null;
}
