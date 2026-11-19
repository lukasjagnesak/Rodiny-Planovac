/**
 * Text marketingového souhlasu.
 *
 * Verze se nikdy nemění na místě. Nová formulace = nový klíč tady
 * i nový řádek v `marketing_souhlas_texty` (migrací). Test
 * `tests/mailchimp.test.js` hlídá, že se text v kódu a v migraci shoduje
 * — jinak by šlo ukázat jiný text, než jaký se eviduje.
 */
export const MARKETING_SOUHLAS = {
  verze: "2026-11-v1",
  text: "Chci e-mailem dostávat praktické tipy pro organizaci péče o děti, novinky a nabídky Klidoo. Souhlas mohu kdykoliv odvolat.",
} as const;

/**
 * Cookie, kterou si registrace přes Google pamatuje zaškrtnutý souhlas
 * přes přesměrování k Googlu a zpět. Do metadat uživatele se z OAuth
 * nic přidat nedá; `/auth/callback` ji přečte, zapíše souhlas a smaže.
 */
export const COOKIE_SOUHLAS = "klidoo_marketing";
