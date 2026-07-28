#!/usr/bin/env bash
#
# Applies every hand-run SQL file in platform/src/lib/migrations/*.sql, in
# filename-sorted order, against a target Postgres (default: the local
# Supabase stack `supabase start` brings up). Part of the local staging
# environment (see scripts/staging-up.sh and docs/adr/0007-staging-environment-plan.md).
#
# There is no migration-tracking table in this repo (see TEAM-READINESS.md
# Phase C — "no migration system" is a known, separate gap; NOT this
# script's job to fix). This script is a best-effort REPLAY of the same
# 156 files onto a fresh database, not a tracked migration runner:
#   - schema files (CREATE TABLE/ALTER ... ADD COLUMN IF NOT EXISTS/CREATE
#     INDEX IF NOT EXISTS) are idempotent by the migration-runbook's own
#     authoring rule and should apply cleanly to an empty DB.
#   - dated DATA migrations (UPDATE/backfill against specific prod rows) will
#     mostly no-op harmlessly on an empty local DB (their WHERE clause
#     matches nothing) — expected, not a failure of this script.
#   - a handful may genuinely fail on a from-scratch DB (ordering quirks
#     between two files sharing the same numeric prefix, or a migration that
#     assumes an object created only on prod). This script logs and CONTINUES
#     past a per-file failure rather than hard-stopping, so one bad legacy
#     file doesn't block the other 155 — every failure is summarized at the
#     end for a human to triage.
#
# USAGE:
#   ./scripts/staging-apply-migrations.sh [connection-string]
#   (default connection string is the standard local `supabase start` DB)

set -uo pipefail
cd "$(dirname "$0")/.."   # repo root

CONN="${1:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
MIGRATIONS_DIR="platform/src/lib/migrations"
LOG_DIR="scripts/.staging-logs"
mkdir -p "$LOG_DIR"
FAIL_LOG="$LOG_DIR/migration-failures.log"
: > "$FAIL_LOG"

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql not found. Install the Postgres client (e.g. 'brew install libpq' + add to PATH)." >&2
  exit 1
fi

if ! psql "$CONN" -c 'select 1' >/dev/null 2>&1; then
  echo "ERROR: cannot reach $CONN — is the local stack up? Run: supabase start" >&2
  exit 1
fi

total=0
ok=0
failed=0

for f in $(find "$MIGRATIONS_DIR" -maxdepth 1 -name '*.sql' | sort); do
  total=$((total + 1))
  name=$(basename "$f")
  if psql "$CONN" -v ON_ERROR_STOP=1 -f "$f" >/dev/null 2>>"$LOG_DIR/$name.err"; then
    ok=$((ok + 1))
    rm -f "$LOG_DIR/$name.err"
  else
    failed=$((failed + 1))
    echo "$name" >> "$FAIL_LOG"
  fi
done

echo ""
echo "==> Applied $ok/$total migration files cleanly."
if [ "$failed" -gt 0 ]; then
  echo "==> $failed file(s) failed — see $FAIL_LOG and per-file logs in $LOG_DIR/*.err"
  echo "    Expected for some legacy/data-backfill files against an empty DB (see this script's header)."
  echo "    Triage: a schema (CREATE/ALTER) failure is worth fixing; a data-UPDATE failure against"
  echo "    zero matching rows is very likely a harmless no-op counted as a psql error here (e.g."
  echo "    a RAISE NOTICE-based verify block) rather than schema drift."
fi
exit 0
