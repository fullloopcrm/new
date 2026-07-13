-- ============================================================================
-- PRE-MERGE WEBHOOK LEDGER CHECK  (READ-ONLY)
-- ----------------------------------------------------------------------------
-- Purpose: the exact confirmation `webhook-hardening-plan.md`'s 2026-07-13
--          sequencing-hazard note (commit b010d620) recommends "an explicit
--          pre-merge check for this branch specifically" — this is that
--          check, built as a file artifact rather than left as a recommendation.
--
-- THE HAZARD THIS GUARDS: `claimWebhookEvent()` (lib/webhook-dedupe.ts) is
-- wired into all 5 non-idempotent inbound webhook handlers on p1-w6
-- (telnyx/route.ts:150, resend/route.ts:34, telegram/route.ts:67,
-- telegram/[tenant]/route.ts:75, telegram/jefe/route.ts:33 — confirmed by
-- direct grep 2026-07-13). Its own docstring + test
-- (webhook-dedupe.test.ts:65-69) say it "re-throws on an unexpected DB error
-- so the caller 5xxs and the provider retries" — fail-closed on ANY insert
-- error that isn't 23505 (unique-violation), INCLUDING 42P01
-- (relation "processed_webhook_events" does not exist), which is exactly
-- what prod returns today because
-- `platform/src/lib/migrations/2026_07_12_processed_webhook_events.sql` is
-- still file-only, unapplied.
--
-- If this branch merges/deploys BEFORE that migration runs: every inbound
-- Telnyx SMS, Resend email, and Telegram (x3) webhook 5xxs on delivery #1 —
-- a hard simultaneous outage of 5 channels, not a degraded-idempotency gap.
--
-- DO NOT EXECUTE AS PART OF ANY AUTOMATED DEPLOY/MERGE SCRIPT. This is a FILE
-- ARTIFACT ONLY, run MANUALLY by Jeff / the leader against prod IMMEDIATELY
-- BEFORE merging/deploying p1-w6's webhook routes — never by a worker, never
-- wired into .worker-driver.sh or any other live fleet script. Zero writes
-- (information_schema only).
--
-- HOW TO RUN:
--   PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres \
--     -d postgres -f deploy-prep/pre-merge-webhook-ledger-check.sql
--
-- HOW TO READ THE RESULT:
--   * 0 rows returned => table does NOT exist. DO NOT MERGE/DEPLOY p1-w6's
--     webhook routes yet — apply
--     `platform/src/lib/migrations/2026_07_12_processed_webhook_events.sql`
--     first (or in the same release window), then re-run this check to
--     confirm before proceeding.
--   * 1 row returned, `has_unique_constraint` = true => table exists with the
--     UNIQUE(provider, event_id) constraint claimWebhookEvent() depends on
--     for its 23505-detects-dedupe logic. Safe to merge/deploy.
--   * 1 row returned, `has_unique_constraint` = false => table exists but
--     without the expected constraint — dedupe would silently never fire
--     (every insert "succeeds", so claimWebhookEvent() always returns true).
--     Different failure mode than the 0-row case (traffic flows but isn't
--     actually deduped) — do not treat this as safe-to-merge without
--     reviewing why the constraint is missing.
--
-- Wrap in a read-only transaction when executing manually:
--     BEGIN; SET TRANSACTION READ ONLY;  -- then run the SELECT below
--     COMMIT;  -- (or ROLLBACK; either is fine, nothing was written)
-- ============================================================================

SELECT
  c.relname                                          AS table_name,
  EXISTS (
    SELECT 1
    FROM pg_constraint con
    WHERE con.conrelid = c.oid
      AND con.contype = 'u'
      AND (
        SELECT array_agg(a.attname ORDER BY a.attname)
        FROM unnest(con.conkey) AS k(attnum)
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
      ) = ARRAY['event_id', 'provider']
  )                                                    AS has_unique_constraint
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'processed_webhook_events'
  AND c.relkind = 'r';
