\set ON_ERROR_STOP on
\pset pager off

-- ═══════════════════════════════════════════════════════════════════
--  Vlastní rozvržení přehledu je osobní, ne rodinné
--
--  `profiles.prehled_karty` si rodič mění sám. Zajímavé jsou dvě věci:
--  že se sloupec vůbec dá zapsat pod vlastní identitou, a že do něj
--  druhý rodič nesmí — sdílí rodinu, ale ne obrazovku.
-- ═══════════════════════════════════════════════════════════════════

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

\echo '--- P1) čerstvý profil má NULL, což znamená výchozí rozvržení'
select prehled_karty is null as vychozi
from profiles
where id = '11111111-1111-1111-1111-111111111111';

\echo '--- P2) vlastní rozvržení jde uložit, vypnutá karta má pomlčku'
update profiles
set prehled_karty = array['vydaje', '-dnes', 'noci']
where id = '11111111-1111-1111-1111-111111111111';

select prehled_karty
from profiles
where id = '11111111-1111-1111-1111-111111111111';

\echo '--- P3) druhému rodiči do jeho přehledu nikdo nesahá'
-- Sdílí rodinu, takže na profil vidí. Zapsat do něj ale nesmí.
update profiles
set prehled_karty = array['vydaje']
where id = '22222222-2222-2222-2222-222222222222';

select coalesce(array_length(prehled_karty, 1), 0) as karet_u_druheho
from profiles
where id = '22222222-2222-2222-2222-222222222222';

\echo '=== PŘEHLED PROŠEL ==='
