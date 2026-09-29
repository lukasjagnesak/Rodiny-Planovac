-- ═══════════════════════════════════════════════════════════════════
--  Storage — fotky účtenek a avatary
--  Cesta k souboru vždy začíná ID rodiny: <family_id>/<expense_id>/<soubor>
--  Díky tomu jde přístup ověřit stejnou funkcí is_family_member().
-- ═══════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts', 'receipts', false, 15728640,  -- 15 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 5242880,      -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── receipts (privátní) ────────────────────────────────────────────

drop policy if exists "receipts_read" on storage.objects;
create policy "receipts_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and is_family_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "receipts_write" on storage.objects;
create policy "receipts_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and can_edit_family(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "receipts_update" on storage.objects;
create policy "receipts_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'receipts'
    and can_edit_family(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "receipts_delete" on storage.objects;
create policy "receipts_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipts'
    and can_edit_family(((storage.foldername(name))[1])::uuid)
  );

-- ── avatars (veřejné pro čtení) ────────────────────────────────────

drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_write" on storage.objects;
create policy "avatars_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update" on storage.objects;
create policy "avatars_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete" on storage.objects;
create policy "avatars_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
