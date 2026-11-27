#!/usr/bin/env bash
# Pustí všechny migrace na čisté databázi a scénáře z tests/db.
#
# Potřebuje PostgreSQL 16 (psql + server). Databázi si vytvoří a smaže sám:
#
#   PGHOST=/var/lib/postgresql/klidoo-test PGPORT=54329 PGUSER=postgres ./scripts/test-db.sh
#
# Výstup scénáře se porovnává očima — každý krok vypisuje, co se stalo,
# a chybové hlášky (ERROR) jsou tam, kde má databáze zápis odmítnout.
set -euo pipefail
cd "$(dirname "$0")/.."

DB="klidoo_test_$$"
psql -q -d postgres -c "create database $DB"
trap 'psql -q -d postgres -c "drop database if exists $DB" >/dev/null' EXIT

psql -q -d "$DB" -v ON_ERROR_STOP=1 -f tests/db/supabase-stub.sql
for f in supabase/migrations/*.sql; do
  psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$f" >/dev/null 2>&1 || {
    echo "✗ migrace selhala: $f"
    psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$f" 2>&1 | grep -v NOTICE | head -5
    exit 1
  }
done
echo "✓ všechny migrace proběhly"

for t in tests/db/*.sql; do
  [[ "$t" == tests/db/supabase-stub.sql ]] && continue
  echo "── $t"
  psql -q -d "$DB" -f "$t" 2>&1 | grep -v "^$\|set_config\|^-*$\|^(1 row)\|^ 00000"
done
