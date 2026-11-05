-- ═══════════════════════════════════════════════════════════════════
--  Oprava textu zprávy při pozvání profesionála (po 0035).
--
--  Zpráva slibovala, že profesionál uvidí „doklady“. Doklady dětí
--  (dokumenty) ale vidí jen rodiče a pečující — člen jen ke čtení ne
--  (politika dokumenty_select, migrace 0018). Účtenky u výdajů vidí.
--  Text teď říká přesně to, co oprávnění v databázi dovolují.
--
--  Spustit lze opakovaně.
-- ═══════════════════════════════════════════════════════════════════

create or replace function pozvi_profesionala(
  target_family uuid,
  email text,
  profese text,
  pristup_do date
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
  adresa text := lower(btrim(email));
begin
  if auth.uid() is null or not je_rodic(target_family) then
    raise exception 'Přístup pro profesionály uděluje rodič.';
  end if;
  if adresa !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Zadejte platný e-mail.';
  end if;
  if profese is null or profese not in ('advokat', 'mediator', 'ospod', 'soud', 'jiny') then
    raise exception 'Vyberte, o koho jde.';
  end if;
  if pristup_do is not null and pristup_do < current_date then
    raise exception 'Datum konce přístupu je v minulosti.';
  end if;

  insert into family_invites (family_id, email, role, custody_side, invited_by, profese, pristup_do)
  values (target_family, adresa, 'viewer', null, auth.uid(), profese, pristup_do)
  returning token into t;

  perform zapis_zpravu_zmeny(
    target_family, auth.uid(),
    'Dávám přístup jen ke čtení: ' || adresa || ' (' || nazev_profese(profese) || ')'
      || coalesce(', do ' || to_char(pristup_do, 'FMDD. FMMM. YYYY'), ', bez data konce')
      || '. Uvidí kalendář, zprávy a výdaje s účtenkami, nic nemůže měnit. Doklady dětí neuvidí. Přístup jde kdykoli odebrat v části Děti a rodina.',
    null
  );
  perform zapis_historii(target_family, 'clenove',
    'Pozvánka s přístupem jen ke čtení: ' || adresa || ' (' || nazev_profese(profese) || ')', null);

  return t;
end;
$$;
