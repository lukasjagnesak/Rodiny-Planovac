-- ═══════════════════════════════════════════════════════════════════
--  Vlastní rozpis může být i dvoutýdenní
--
--  Řada rodin nemá rozpis, který by se opakoval každý týden. Typicky:
--  jeden týden mají děti od středy do pondělí, druhý týden jen ve čtvrtek.
--  Sedmidenní rozpis takový cyklus nezachytí, proto `weekly_map` nově
--  přijímá i 14 znaků. Který kalendářní týden je v cyklu první, určuje
--  `anchor_date`.
-- ═══════════════════════════════════════════════════════════════════

alter table custody_patterns drop constraint if exists custody_patterns_weekly_map_len;

alter table custody_patterns add constraint custody_patterns_weekly_map_len
  check (weekly_map is null or weekly_map ~ '^[ab]{7}$' or weekly_map ~ '^[ab]{14}$');

comment on column custody_patterns.weekly_map is
  'Rozpis dnů od pondělí, znaky a/b. Sedm znaků = opakuje se každý týden, čtrnáct = dvoutýdenní cyklus počítaný od týdne, do kterého padá anchor_date.';
