-- 2026_07_17_schedule_issues_open_dedup_unique.sql
-- FILE ONLY -- do NOT execute here. Leader runs after Jeff approves.
--
-- W1 fresh-ground finding (2026-07-17). cron/schedule-monitor's own
-- "Dedup + write" step (route.ts, bottom of the per-tenant loop) is a plain
-- check-then-insert: it SELECTs every open/acknowledged schedule_issues
-- message for the tenant, filters `issues` down to ones not already in that
-- set, then INSERTs each survivor -- with no DB-level constraint backing the
-- dedup. Same check-then-insert shape already fixed this session on
-- job_events (2026_07_17_job_events_review_requested_unique.sql),
-- comhub_messages, outreach_log, etc.
--
-- This cron has maxDuration=300 and loops every active tenant sequentially
-- inside one invocation -- exactly the shape (long-running, multi-tenant
-- fan-out) this session has repeatedly found gets retried by Vercel on a
-- timeout, producing two overlapping invocations. If both read the same
-- empty existingMessages set for a tenant before either's insert lands, both
-- write the identical (tenant_id, message) issue row -- a duplicate
-- "double-booked" / "overlapping jobs" / "no car" etc. row on the admin
-- schedule-issues dashboard, silently doubling the panel's issue count and
-- (if an admin resolves one) leaving a decoy duplicate still open.
--
-- Lower blast radius than this session's send-side races (no duplicate
-- SMS/email, no financial double-post) -- it's an admin-facing data
-- integrity issue, not a customer-facing or accounting one -- but it is a
-- real, currently-unguarded duplicate-write path with no constraint at all
-- (schedule_issues has never had anything beyond the two plain indexes in
-- supabase/smart_scheduling.sql).
--
-- DEDUPE-FIRST, same discipline as every other constraint added this
-- session: adding the partial unique index directly against live data that
-- may already contain duplicates (the race being real and already
-- exploitable) would just fail to apply. Step 1 keeps exactly one row per
-- (tenant_id, message) among currently-open/acknowledged rows (oldest
-- created_at, then lowest id for a deterministic tie-break) and marks every
-- other row in the group 'resolved' with a resolution_note explaining the
-- collapse -- nothing is deleted, so any admin audit trail on the duplicate
-- (e.g. a resolution note someone already wrote on it) is preserved, not
-- erased. Step 2 adds the index, scoped to status IN ('open','acknowledged')
-- to match exactly the app's own dedup query (route.ts's `.in('status',
-- ['open','acknowledged'])` before building existingMessages) -- resolved/
-- dismissed rows are historical and legitimately allowed to share a message
-- with a fresh open recurrence of the same issue.
--
-- Code fix (same commit, cron/schedule-monitor/route.ts): the insert loop
-- now checks the insert's error for a duplicate-key hit (code 23505) and
-- treats it as an idempotent no-op (lost the race to a concurrent/
-- overlapping invocation) instead of surfacing it as a failure -- same
-- pattern as cron/comhub-email's 23505 handling on comhub_messages.

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY tenant_id, message
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM schedule_issues
  WHERE status IN ('open', 'acknowledged')
)
UPDATE schedule_issues si
SET
  status = 'resolved',
  resolved_at = now(),
  resolved_by = 'auto',
  resolution_note = 'Auto-resolved: duplicate of an earlier open issue with the same message for this tenant (dedup migration 2026_07_17_schedule_issues_open_dedup_unique)'
FROM ranked
WHERE si.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_issues_tenant_message_open_unique
  ON schedule_issues (tenant_id, message)
  WHERE status IN ('open', 'acknowledged');

-- ── VERIFICATION (fail-loud) ────────────────────────────────────────────
-- No (tenant_id, message) group among open/acknowledged rows should have
-- more than one row left after the dedup step above.
DO $$
DECLARE
  n_remaining bigint;
BEGIN
  SELECT count(*) INTO n_remaining
  FROM (
    SELECT tenant_id, message
    FROM schedule_issues
    WHERE status IN ('open', 'acknowledged')
    GROUP BY tenant_id, message
    HAVING count(*) > 1
  ) dupes;

  IF n_remaining > 0 THEN
    RAISE EXCEPTION
      '2026_07_17_schedule_issues_open_dedup_unique: % (tenant_id, message) group(s) still collide after dedupe',
      n_remaining;
  END IF;

  RAISE NOTICE '2026_07_17_schedule_issues_open_dedup_unique: OK, no open/acknowledged schedule_issues collisions remain';
END $$;
