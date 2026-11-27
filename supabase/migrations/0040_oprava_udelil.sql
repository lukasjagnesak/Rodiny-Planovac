-- ═══════════════════════════════════════════════════════════════════
--  Oprava po 0035: sloupec `family_members.udelil` měl cizí klíč na
--  profiles. Tím vedly z family_members na profiles dva klíče a dotazy
--  `family_members … profile:profiles(*)` PostgREST odmítal („více než
--  jeden vztah"). Aplikace pak neviděla členy rodiny — prázdný výběr
--  „Kdo zaplatil", chybějící jména, připomínky bez příjemců.
--
--  Sloupec zůstává, jen bez klíče. Když se účet toho, kdo přístup
--  udělil, smaže, zůstane v něm staré ID — obrazovka pak jméno neukáže.
--
--  Spustit lze opakovaně.
-- ═══════════════════════════════════════════════════════════════════

alter table family_members drop constraint if exists family_members_udelil_fkey;

-- PostgREST si vztahy drží v paměti; ať změnu vezme hned.
notify pgrst, 'reload schema';
