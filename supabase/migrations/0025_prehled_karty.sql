-- ═══════════════════════════════════════════════════════════════════
--  Vlastní rozvržení přehledu
--
--  Které karty rodič na přehledu vidí a v jakém pořadí. Osobní věc,
--  ne rodinná — každý rodič se dívá na něco jiného, tak to patří
--  k profilu, ne k rodině.
--
--  Pole je v pořadí, ve kterém se karty kreslí. Vypnutá karta v poli
--  zůstává, jen s pomlčkou na začátku (`-vydaje`). Bez toho by nešlo
--  poznat „tohle rodič vypnul" od „tohle v době ukládání ještě
--  neexistovalo" a každá nová karta by u starých účtů zůstala
--  neviditelná.
--
--  NULL i prázdné pole znamenají výchozí rozvržení, takže se nic
--  nemusí dopisovat existujícím účtům.
-- ═══════════════════════════════════════════════════════════════════

alter table profiles
  add column if not exists prehled_karty text[];

comment on column profiles.prehled_karty is
  'Pořadí karet na přehledu; pomlčka na začátku = vypnutá. NULL = výchozí.';
