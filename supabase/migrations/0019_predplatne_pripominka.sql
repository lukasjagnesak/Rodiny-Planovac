-- ═══════════════════════════════════════════════════════════════════
--  Kdy jsme naposledy upozorňovali na předplatné
--
--  Cron běží každou hodinu, e-mail o konci zkušebního období ale smí
--  přijít nanejvýš jednou denně. Datum se drží u předplatného, ne
--  u uživatele: platí rodina, tak i připomínka je věc rodiny.
-- ═══════════════════════════════════════════════════════════════════

alter table predplatna
  add column if not exists pripominka_poslana date;
