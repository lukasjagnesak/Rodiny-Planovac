-- ═══════════════════════════════════════════════════════════════════
--  Upozornění správci na novou rodinu a na připojení druhého rodiče.
--
--  Značka „ohlášeno" v databázi, ne v paměti serveru: upozornění se
--  posílá hned po založení (volá ho průvodce) a pro jistotu ještě
--  z hodinového cronu — kdyby člověk zavřel prohlížeč dřív, než se
--  volání odeslalo. Značka se nastavuje jedním UPDATE … WHERE … IS NULL,
--  takže i když přijdou obě cesty naráz, upozornění odejde jednou.
--
--  Spustit lze opakovaně.
-- ═══════════════════════════════════════════════════════════════════

alter table families add column if not exists ohlaseno_spravci timestamptz;
alter table family_members add column if not exists ohlaseno_spravci timestamptz;

-- Co už existuje, se neohlašuje — jinak by po nasazení přišla smršť.
update families set ohlaseno_spravci = now() where ohlaseno_spravci is null;
update family_members set ohlaseno_spravci = now() where ohlaseno_spravci is null;

-- Uživatel by si značku u své rodiny mohl nastavit sám (smí upravovat
-- svou rodinu). Nevadí: jediné, čeho by tím dosáhl, je, že správci
-- nepřijde upozornění na jeho vlastní rodinu.
