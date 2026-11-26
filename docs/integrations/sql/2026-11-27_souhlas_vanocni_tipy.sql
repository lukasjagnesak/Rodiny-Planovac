-- ═══════════════════════════════════════════════════════════════════
--  Druhá verze marketingového souhlasu: 5 vánočních tipů
--
--  Spouští se ručně v Supabase → SQL Editor (projekt Stridava_pece).
--  Není v supabase/migrations, protože upravuje funkce integrace
--  s Mailchimpem, které žijí jen v Supabase (viz docs/integrations).
--
--  Mění dvě funkce, nic jiného:
--  - public.marketing_request přijme i verzi 'klidoo-vanoce-tipy-2026-11'
--  - klidoo_mail_private.lead_added ji z leadu předá s přesným textem
--  Původní verze 'klidoo-email-2026-11-06' funguje beze změny.
--
--  POZOR na rozsah souhlasu: kdo dal jen tuto verzi, souhlasil s 5 tipy
--  do 23. 12. — ne s obecnými novinkami. Před zapnutím sekvence
--  'why-klidoo-v1' nebo kampaní na celou audience je vyřaďte
--  (marketing_contacts.consent_version = 'klidoo-vanoce-tipy-2026-11'),
--  nebo je v posledním tipu požádejte o souhlas s novinkami.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.marketing_request(address text, origin_source text, version_text text, consent_text text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare e text := lower(btrim(address)); inserted boolean;
begin
 if e is null or e !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(e)>254
    or version_text is null
    or version_text not in ('klidoo-email-2026-11-06','klidoo-vanoce-tipy-2026-11')
    or consent_text is null then raise exception 'invalid-consent'; end if;
 -- A suppression is a tombstone. Neither retries nor a new lead can erase it.
 if exists(select 1 from public.mail_odhlaseni where email=e) then return; end if;
 insert into public.marketing_contacts(email,status,source,consent_version,consent_text,requested_at)
 values(e,'pending',origin_source,version_text,consent_text,now()) on conflict(email) do update
 set status='pending',consent_version=excluded.consent_version,consent_text=excluded.consent_text,
 requested_at=now(),revision=marketing_contacts.revision+1,dirty=true,attempts=0,next_attempt_at=now()
 where marketing_contacts.status='none';
 inserted := found;
 if inserted then
  insert into public.marketing_audit(email,event,source,consent_version,consent_text) values(e,'requested',origin_source,version_text,consent_text);
 end if;
end; $function$;

CREATE OR REPLACE FUNCTION klidoo_mail_private.lead_added()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare e text:=lower(btrim(new.email)); src text;
begin
 src:=case when new.magnet in ('vzor-dohody','checklist-30-dni','pdf-vyzivne','advokati','mediatori','newsletter') then new.magnet else 'web-form' end;
 insert into public.marketing_contacts(email,status,source,full_name) values(e,'none',src,left(new.jmeno,120)) on conflict do nothing;
 insert into public.marketing_contact_sources(email,source,attribution) values(e,src,
  klidoo_mail_private.clean_attribution(jsonb_build_object('utm_source',new.utm_source,'utm_medium',new.utm_medium,'utm_campaign',new.utm_campaign,'landing',new.landing)))
 on conflict(email,source) do update set attribution=excluded.attribution,last_seen_at=now();
 if new.marketing_consent is true and new.marketing_consent_version='klidoo-email-2026-11-06' then
  perform public.marketing_request(e,src,'klidoo-email-2026-11-06','Chci dostávat e-mailem novinky a nabídky Klidoo. Souhlas mohu kdykoli odvolat.');
 elsif new.marketing_consent is true and new.marketing_consent_version='klidoo-vanoce-tipy-2026-11' then
  perform public.marketing_request(e,src,'klidoo-vanoce-tipy-2026-11','Pošlete mi i 5 krátkých tipů, jak zvládnout Vánoce ve dvou domovech (do 23. 12.). Odhlásit se jde jedním klikem.');
 end if;
 -- Download alone never requests a subscription.
 return new;
end; $function$;
