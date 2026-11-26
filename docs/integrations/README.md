# Integrace s Mailchimpem

Integrace běží **v Supabase** (projekt `Stridava_pece`, eu-central-1):

- Edge Functions `mailchimp-sync`, `mailchimp-webhook`, `mailchimp-consent`;
- tabulky `marketing_contacts`, `marketing_audit`, `marketing_contact_sources`,
  `marketing_sequences`, `marketing_sequence_enrollments`;
- triggery na `auth.users`, `profiles`, `leady`, `kalkulacka_plany`
  a `mail_odhlaseni`;
- migrace `mailchimp_*` z 6. 11. 2026.

Kód těchto funkcí **není v tomto repozitáři**, žije jen v Supabase.

## Napojení z webu
- **Souhlas:** jen přes `public.marketing_request(address, origin_source,
  version_text, consent_text)` s verzí `klidoo-email-2026-11-06` a přesným
  textem z `src/lib/marketing-souhlas.ts`. Volá ho servisní klíč
  (`/api/marketing/souhlas`) nebo triggery (`leady.marketing_consent`,
  registrační metadata `marketing_opt_in` + `marketing_consent_version`).
- **Odhlášení:** zápis do `mail_odhlaseni`, který dělá `/odhlasit`
  i `marketing_suppress`. Je trvalé.

`mailchimp-audit.md` je audit stavu před nasazením této integrace.
