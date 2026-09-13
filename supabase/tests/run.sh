#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  Ověří migrace proti čistému Postgresu — hlavně že RLS opravdu
#  odděluje rodiny a že upserty mají po čem sáhnout.
#
#  Vyžaduje lokální Postgres. Použití:
#      bash supabase/tests/run.sh                  # výchozí připojení
#      PGHOST=/tmp PGPORT=5433 bash supabase/tests/run.sh
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

cd "$(dirname "$0")/../.."

DB="${TEST_DB:-klidoo_test}"
PSQL=(psql -U "${PGUSER:-postgres}" -v ON_ERROR_STOP=1 -q)

echo "▶ Připravuji čistou databázi $DB"
"${PSQL[@]}" -d postgres -c "drop database if exists $DB" >/dev/null
"${PSQL[@]}" -d postgres -c "create database $DB" >/dev/null

echo "▶ Napodobenina Supabase (auth + storage)"
"${PSQL[@]}" -d "$DB" -f supabase/tests/00_supabase_stub.sql >/dev/null

for migration in supabase/migrations/*.sql; do
  echo "▶ $(basename "$migration")"
  "${PSQL[@]}" -d "$DB" -f "$migration" >/dev/null
done

echo "▶ Testy chování"
for test in supabase/tests/0[1-9]_*_test.sql; do
  echo "▶ $(basename "$test")"
  psql -U "${PGUSER:-postgres}" -d "$DB" -f "$test"
done

echo
echo "✓ Migrace i zabezpečení se chovají podle očekávání"
