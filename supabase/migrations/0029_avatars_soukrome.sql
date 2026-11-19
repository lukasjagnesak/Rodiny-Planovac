-- ═══════════════════════════════════════════════════════════════════
-- Úložiště „avatars" už není veřejné.
--
-- Vzniklo v 0003 jako veřejné pro čtení: kdokoli bez přihlášení mohl
-- stáhnout soubor podle adresy a přes API dokonce vypsat, co v něm leží.
-- Aplikace do něj zatím nic nenahrává — ale až bude, šlo by o fotky
-- rodičů a dětí, a ty veřejně ležet nesmí. Zavírá se dřív, než se
-- do něj cokoli dostane.
--
-- Číst teď smí jen přihlášený vlastník složky (`<uid>/…`), stejně jako
-- už předtím jen on smí zapisovat a mazat. Spustit lze opakovaně.
-- ═══════════════════════════════════════════════════════════════════

update storage.buckets set public = false where id = 'avatars';

drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
