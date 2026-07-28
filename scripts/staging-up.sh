#!/usr/bin/env bash
#
# Brings up a persistent LOCAL staging environment: local Supabase (Docker,
# via the Supabase CLI) + this repo's migrations applied + one representative
# tenant seeded. Free — no cloud resource is created; this is the
# config/scripts option from docs/adr/0007-staging-environment-plan.md,
# not the (cost-gated, Jeff-approval-required) dedicated cloud staging
# project also described in that ADR.
#
# Data PERSISTS across stop/start (Docker named volumes) — re-running this
# script after `supabase stop` picks the DB back up where it left off. Use
# `supabase db reset` (see below) for a clean slate.
#
# PREREQUISITE: Docker Desktop (or equivalent) running. This script does not
# start Docker itself.
#
# USAGE:
#   ./scripts/staging-up.sh            # start + migrate + seed if empty
#   ./scripts/staging-up.sh --reset    # wipe local DB, then migrate + seed fresh

set -uo pipefail
cd "$(dirname "$0")/.."   # repo root

if ! command -v supabase >/dev/null 2>&1; then
  echo "ERROR: supabase CLI not found. Install: https://supabase.com/docs/guides/cli" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker daemon not reachable. Start Docker Desktop, then re-run this script." >&2
  exit 1
fi

echo "==> Starting local Supabase stack (supabase start)…"
supabase start

# Standard, publicly-documented local-dev defaults that `supabase start`
# always uses (not secrets — local-only, never valid against prod).
export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$(supabase status -o env 2>/dev/null | grep '^SERVICE_ROLE_KEY=' | cut -d= -f2- | tr -d '"')}"

if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "ERROR: could not read the local service_role key from 'supabase status'. Run 'supabase status' and export SUPABASE_SERVICE_ROLE_KEY manually." >&2
  exit 1
fi

if [ "${1:-}" = "--reset" ]; then
  echo "==> Resetting local DB to a clean slate…"
  supabase db reset
fi

echo "==> Applying platform/src/lib/migrations/*.sql (best-effort replay — see script header)…"
./scripts/staging-apply-migrations.sh

# Only seed if the DB looks empty — a stray tenants row means this has
# already been seeded and re-seeding would just pile up duplicate fixtures.
EXISTING=$(psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -tAc "select count(*) from tenants" 2>/dev/null || echo "0")
if [ "${EXISTING:-0}" = "0" ]; then
  echo "==> No tenants found — seeding one representative tenant…"
  (cd platform && npx tsx scripts/staging-seed-tenant.ts)
else
  echo "==> $EXISTING tenant(s) already present — skipping seed (pass --reset to start clean)."
fi

echo ""
echo "==> Local staging is up."
echo "    DB:       postgresql://postgres:postgres@127.0.0.1:54322/postgres"
echo "    API:      http://127.0.0.1:54321"
echo "    Studio:   run 'supabase status' for the Studio URL"
echo ""
echo "    Point the app at it: cd platform && NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<from 'supabase status'> npm run dev"
echo "    Tear down (keeps data): supabase stop"
echo "    Tear down (wipes data): supabase stop --no-backup"
