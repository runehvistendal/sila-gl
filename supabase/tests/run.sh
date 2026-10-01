#!/usr/bin/env bash
# Kører alle migrationer mod en lokal Postgres med Supabase-stubs og derefter
# SQL-testene. Kræver psql + en kørende Postgres (PGHOST/PGPORT/PGUSER).
#   PGHOST=/var/tmp/silapg PGPORT=5433 PGUSER=postgres ./supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=sila_test
psql -qc "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB" >/dev/null
psql -d $DB -q -v ON_ERROR_STOP=1 -f tests/supabase_stub.sql >/dev/null
tmp=$(mktemp)
for f in migrations/*.sql; do
  # security_audit refererer profiles.role_type, som først oprettes 20260428120000.
  # Remote fik den i en anden rækkefølge — vi spejler det her.
  [[ "$f" == *20260427020000_security_audit.sql ]] && continue
  sed -e 's/CREATE EXTENSION IF NOT EXISTS pg_cron[^;]*;//I' "$f" > "$tmp"
  psql -d $DB -q -v ON_ERROR_STOP=1 -f "$tmp" >/dev/null 2>&1 || { echo "MIGRATION FEJLEDE: $f"; psql -d $DB -v ON_ERROR_STOP=1 -f "$tmp" 2>&1 | tail -3; exit 1; }
  if [[ "$f" == *20260428120000_profiles_role_type_location.sql ]]; then
    psql -d $DB -q -v ON_ERROR_STOP=1 -f migrations/20260427020000_security_audit.sql >/dev/null 2>&1
  fi
done
rm -f "$tmp"
out=$(psql -d $DB -f tests/booking_integrity.test.sql 2>&1 | grep -o "\(PASS\|FAIL\): .*")
echo "$out"
if echo "$out" | grep -q "^FAIL"; then exit 1; fi
echo "Alle $(echo "$out" | grep -c PASS) tests bestået."
