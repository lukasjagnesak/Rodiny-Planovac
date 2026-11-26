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
