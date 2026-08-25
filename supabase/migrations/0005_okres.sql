-- ═══════════════════════════════════════════════════════════════════
--  Okres školy — kvůli jarním prázdninám
--
--  Jarní prázdniny se v Česku liší podle okresu, ve kterém škola sídlí
--  (příloha vyhlášky č. 16/2005 Sb.). Ukládá se proto k dítěti, ne
--  k rodině — sourozenci můžou chodit do škol v různých okresech.
-- ═══════════════════════════════════════════════════════════════════

alter table children add column if not exists okres text;

comment on column children.okres is
  'Okres nebo pražský obvod podle přílohy vyhlášky 16/2005 Sb. Určuje termín jarních prázdnin.';
