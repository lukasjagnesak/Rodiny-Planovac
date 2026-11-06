-- ═══════════════════════════════════════════════════════════════════
--  Row Level Security — všechna data jsou přísně oddělená po rodinách
-- ═══════════════════════════════════════════════════════════════════

-- Pomocné funkce jsou SECURITY DEFINER, aby politika nad `family_members`
-- nevolala sama sebe (nekonečná rekurze).

create or replace function is_family_member(target_family uuid)
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
  );
$$;

create or replace function can_edit_family(target_family uuid)
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

create or replace function is_family_owner(target_family uuid)
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
      and role = 'owner'
  );
$$;

-- Rodiny, do kterých patřím (pro čtení profilů ostatních členů)
create or replace function my_family_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select family_id from family_members where user_id = auth.uid();
$$;

alter table families            enable row level security;
alter table profiles            enable row level security;
alter table family_members      enable row level security;
alter table family_invites      enable row level security;
alter table children            enable row level security;
alter table custody_patterns    enable row level security;
alter table custody_overrides   enable row level security;
alter table activities          enable row level security;
alter table activity_occurrences enable row level security;
alter table events              enable row level security;
alter table expenses            enable row level security;
alter table receipts            enable row level security;
alter table google_accounts     enable row level security;
alter table google_event_links  enable row level security;
alter table notifications       enable row level security;

-- ── families ───────────────────────────────────────────────────────
drop policy if exists families_select on families;
create policy families_select on families
  for select using (is_family_member(id));

drop policy if exists families_insert on families;
create policy families_insert on families
  for insert with check (auth.uid() = created_by);

drop policy if exists families_update on families;
create policy families_update on families
  for update using (is_family_owner(id)) with check (is_family_owner(id));

drop policy if exists families_delete on families;
create policy families_delete on families
  for delete using (is_family_owner(id));

-- ── profiles ───────────────────────────────────────────────────────
-- Vidím sebe + všechny, s kým sdílím rodinu.
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from family_members fm
      where fm.user_id = profiles.id
        and fm.family_id in (select my_family_ids())
    )
  );

drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles
  for insert with check (id = auth.uid());

-- ── family_members ─────────────────────────────────────────────────
drop policy if exists family_members_select on family_members;
create policy family_members_select on family_members
  for select using (user_id = auth.uid() or is_family_member(family_id));

-- Pozor: podmínka nesmí sahat na family_members přímo — politika by volala
-- sama sebe. Proto přes SECURITY DEFINER funkci.
create or replace function family_has_members(target_family uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from family_members where family_id = target_family);
$$;

drop policy if exists family_members_insert on family_members;
create policy family_members_insert on family_members
  for insert with check (
    -- zakladatel rodiny se přidává sám, jinak přidává jen vlastník
    (user_id = auth.uid() and not family_has_members(family_id))
    or is_family_owner(family_id)
  );

drop policy if exists family_members_update on family_members;
create policy family_members_update on family_members
  for update using (is_family_owner(family_id) or user_id = auth.uid())
  with check (is_family_owner(family_id) or user_id = auth.uid());

drop policy if exists family_members_delete on family_members;
create policy family_members_delete on family_members
  for delete using (is_family_owner(family_id) or user_id = auth.uid());

-- ── family_invites ─────────────────────────────────────────────────
drop policy if exists family_invites_select on family_invites;
create policy family_invites_select on family_invites
  for select using (is_family_member(family_id));

drop policy if exists family_invites_write on family_invites;
create policy family_invites_write on family_invites
  for all using (is_family_owner(family_id)) with check (is_family_owner(family_id));

-- ── Generická politika pro tabulky s family_id ─────────────────────
-- Čtení: kterýkoli člen. Zápis: členové s rolí owner/parent/guardian.

do $$
declare
  t text;
begin
  foreach t in array array[
    'children', 'custody_patterns', 'custody_overrides',
    'activities', 'activity_occurrences', 'events',
    'expenses', 'receipts', 'google_event_links'
  ] loop
    execute format('drop policy if exists %I_select on %I', t, t);
    execute format(
      'create policy %I_select on %I for select using (is_family_member(family_id))', t, t
    );

    execute format('drop policy if exists %I_insert on %I', t, t);
    execute format(
      'create policy %I_insert on %I for insert with check (can_edit_family(family_id))', t, t
    );

    execute format('drop policy if exists %I_update on %I', t, t);
    execute format(
      'create policy %I_update on %I for update using (can_edit_family(family_id)) with check (can_edit_family(family_id))', t, t
    );

    execute format('drop policy if exists %I_delete on %I', t, t);
    execute format(
      'create policy %I_delete on %I for delete using (can_edit_family(family_id))', t, t
    );
  end loop;
end $$;

-- google_event_links jsou navíc soukromé pro daného uživatele
drop policy if exists google_event_links_select on google_event_links;
create policy google_event_links_select on google_event_links
  for select using (user_id = auth.uid());

-- ── google_accounts ────────────────────────────────────────────────
drop policy if exists google_accounts_own on google_accounts;
create policy google_accounts_own on google_accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── notifications ──────────────────────────────────────────────────
drop policy if exists notifications_select on notifications;
create policy notifications_select on notifications
  for select using (user_id = auth.uid() or is_family_member(family_id));

drop policy if exists notifications_insert on notifications;
create policy notifications_insert on notifications
  for insert with check (can_edit_family(family_id));

drop policy if exists notifications_update on notifications;
create policy notifications_update on notifications
  for update using (user_id = auth.uid() or can_edit_family(family_id))
  with check (user_id = auth.uid() or can_edit_family(family_id));

-- ═══════════════════════════════════════════════════════════════════
--  RPC: založení rodiny a přijetí pozvánky
-- ═══════════════════════════════════════════════════════════════════

create or replace function create_family(
  family_name text,
  my_name text default null,
  my_side custody_side default 'a'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Není přihlášený uživatel';
  end if;

  insert into families (name, created_by)
  values (family_name, auth.uid())
  returning id into new_id;

  insert into family_members (family_id, user_id, role, custody_side, display_name)
  values (new_id, auth.uid(), 'owner', my_side, my_name);

  if my_name is not null then
    update profiles set full_name = my_name
    where id = auth.uid() and coalesce(full_name, '') = '';
  end if;

  return new_id;
end;
$$;

create or replace function accept_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv family_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Není přihlášený uživatel';
  end if;

  select * into inv from family_invites
  where token = invite_token
    and accepted_at is null
    and expires_at > now();

  if inv.id is null then
    raise exception 'Pozvánka je neplatná nebo už vypršela';
  end if;

  insert into family_members (family_id, user_id, role, custody_side)
  values (inv.family_id, auth.uid(), inv.role, inv.custody_side)
  on conflict (family_id, user_id) do nothing;

  update family_invites set accepted_at = now() where id = inv.id;

  return inv.family_id;
end;
$$;

grant execute on function create_family(text, text, custody_side) to authenticated;
grant execute on function accept_invite(text) to authenticated;
