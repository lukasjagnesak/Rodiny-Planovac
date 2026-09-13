-- ═══════════════════════════════════════════════════════════════════
--  Paywall v databázi
--
--  Aplikace zapisuje do Supabase přímo z prohlížeče, takže kontrola
--  v Reactu není kontrola. Jediné místo, kde paywall opravdu platí,
--  je RLS.
--
--  Trik: `can_edit_family()` už používá každá zapisovací politika
--  (i ty nad storage). Stačí do ní přidat podmínku předplatného
--  a paywall platí všude naráz. Role se přitom ověřuje dál — jen se
--  vytáhla do `is_family_editor()`, aby ji mohla použít i místa,
--  kde jde o čtení.
--
--  Po vypršení se zamyká jen zápis. Čtení zůstává: rodič, který ze dne
--  na den přijde o kalendář dětí, se nevrátí a ještě o tom napíše.
-- ═══════════════════════════════════════════════════════════════════

-- ── Role bez ohledu na placení ────────────────────────────────────
create or replace function is_family_editor(target_family uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from family_members
    where family_id = target_family
      and user_id = auth.uid()
      and role in ('owner', 'parent', 'guardian')
  );
$$;

-- ── Smí rodina zapisovat? ─────────────────────────────────────────
-- Rodina bez záznamu je starší než tabulka `predplatna` — nezamykat.
-- Po splatnosti se ještě zapisovat smí: Stripe platbu několikrát
-- opakuje a většina těch karet jenom expirovala.
-- Stejná pravidla jako `vyhodnot()` v src/lib/predplatne-pravidla.ts.
create or replace function rodina_smi_zapisovat(target_family uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select p.stav in ('aktivni', 'po_splatnosti') or p.plati_do > now()
      from predplatna p
      where p.family_id = target_family
    ),
    true
  );
$$;

-- ── Čtení, které dřív viselo na `can_edit_family` ─────────────────
-- Dokumenty jsou jen pro pečující role, ne pro „jen pro čtení".
-- To má platit dál i bez zaplaceného předplatného.
drop policy if exists dokumenty_select on dokumenty;
create policy dokumenty_select on dokumenty
  for select using (is_family_editor(family_id));

drop policy if exists "dokumenty_read" on storage.objects;
create policy "dokumenty_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'dokumenty'
    and is_family_editor(((storage.foldername(name))[1])::uuid)
  );

-- ── A teprve teď paywall ──────────────────────────────────────────
-- Pozvánky zůstávají na `is_family_owner`, tedy otevřené i po vypršení:
-- druhý rodič je důvod, proč si lidé předplatné pořizují.
create or replace function can_edit_family(target_family uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select is_family_editor(target_family) and rodina_smi_zapisovat(target_family);
$$;
