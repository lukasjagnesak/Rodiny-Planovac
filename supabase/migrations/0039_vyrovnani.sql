-- ═══════════════════════════════════════════════════════════════════
--  Vyrovnání výdajů: kdo komu dluží a potvrzení, že je zaplaceno.
--
--  Zaplacení potvrzuje ten, komu se platilo (kdo výdaj zaplatil) — ví,
--  jestli peníze přišly, a jeho potvrzení se nedá zpochybnit. Dlužník
--  si výdaj „vyrovnaný" sám odkliknout nemůže. Platí to, když jsou
--  v rodině oba rodiče; kdo je v Klidoo sám, vede si to celé sám.
--
--  Hromadné vyrovnání zapíše jednu zprávu do Zpráv se seznamem výdajů,
--  takže je dohledatelné i ve výpisu pro soud.
--
--  Spustit lze opakovaně.
-- ═══════════════════════════════════════════════════════════════════

-- ── Kdo smí přepnout „vyrovnáno" ──────────────────────────────────
create or replace function hlidej_vyrovnani()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.settled is not distinct from old.settled
     or auth.uid() is null
     or old.paid_by is null
     or old.paid_by = auth.uid()
     or coalesce(current_setting('klidoo.potvrzeni', true), '') = 'ano'
     or not ma_dva_rodice(old.family_id) then
    return new;
  end if;
  raise exception 'Zaplacení potvrzuje ten, kdo výdaj zaplatil (%).',
    coalesce(jmeno_clena(old.family_id, old.paid_by), 'druhý rodič');
end;
$$;

drop trigger if exists hlidej_vyrovnani_trg on expenses;
create trigger hlidej_vyrovnani_trg before update on expenses
  for each row execute function hlidej_vyrovnani();

-- ── Hromadné vyrovnání ────────────────────────────────────────────
-- Vyrovná vybrané výdaje, které zaplatil volající a nemají rozběhnutou
-- žádost o proplacení (ty se vyrovnávají potvrzením žádosti). Ostatní
-- přeskočí. Vrací počet vyrovnaných.
create or replace function vyrovnej_vydaje(vydaje uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rodina uuid;
  dva boolean;
  e record;
  pocet int := 0;
  celkem numeric := 0;
  seznam text := '';
begin
  if auth.uid() is null or vydaje is null or cardinality(vydaje) = 0 then
    return 0;
  end if;
  select family_id into rodina from expenses where id = vydaje[1];
  if rodina is null or not can_edit_family(rodina) then
    raise exception 'Vyrovnání teď zapsat nemůžete.';
  end if;
  if exists (select 1 from expenses where id = any(vydaje) and family_id <> rodina) then
    raise exception 'Výdaje musí být z jedné rodiny.';
  end if;
  dva := ma_dva_rodice(rodina);

  for e in
    select x.* from expenses x
    where x.id = any(vydaje)
      and x.family_id = rodina
      and not x.settled
      and (not dva or x.paid_by = auth.uid())
      and not exists (
        select 1 from zadosti_proplaceni z where z.expense_id = x.id and z.stav in ('ceka', 'schvaleno')
      )
    order by x.spent_on
  loop
    update expenses set settled = true where id = e.id;
    pocet := pocet + 1;
    celkem := celkem + round(e.amount * e.split_percent / 100, 2);
    if char_length(seznam) < 3000 then
      seznam := seznam || chr(10) || '• ' || e.title || ' (' || to_char(e.spent_on, 'FMDD. FMMM.') || '), '
        || castka_presne(round(e.amount * e.split_percent / 100, 2));
    end if;
  end loop;

  if pocet > 0 and dva then
    insert into zpravy (family_id, autor, autor_jmeno, text)
    values (rodina, auth.uid(), jmeno_clena(rodina, auth.uid()),
      'Potvrzuji, že je vyrovnáno: ' || pocet || ' '
        || case when pocet = 1 then 'výdaj' when pocet < 5 then 'výdaje' else 'výdajů' end
        || ', celkem ' || castka_presne(celkem) || '.' || seznam);
  end if;

  return pocet;
end;
$$;

grant execute on function vyrovnej_vydaje(uuid[]) to authenticated;
