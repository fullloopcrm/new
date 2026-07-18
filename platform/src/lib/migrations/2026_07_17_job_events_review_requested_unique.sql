-- 2026_07_17_job_events_review_requested_unique.sql
-- W1 fresh-ground finding (2026-07-17), same cron/post-job-followup pass as
-- 2026_07_17_bookings_review_followup_sent_at.sql. The job-completion
-- review-request branch deduped via a pre-send
-- `select count(*) from job_events where job_id=... and
-- event_type='review_requested'`, then inserted the event row AFTER
-- sendSMS() -- same send-before-claim ordering already fixed this session on
-- rating-prompt/comhub-email/payment-reminder/outreach. job_events had no
-- constraint backing that count() check, so two overlapping cron
-- invocations could both read 0 and both text the client for the same
-- completed job.
--
-- Fix (code, same commit): insert the job_events row FIRST -- this partial
-- unique index is the atomic claim, mirroring outreach_log's existing
-- unique constraint on (tenant_id, client_id, moment_id) -- and only send if
-- the insert succeeds (duplicate-key = lost the race, skip).
--
-- Partial (not a plain unique(job_id, event_type)): job_events is an
-- append-only timeline that legitimately repeats other event types (note,
-- session_completed across multiple sessions, etc.) -- only
-- review_requested needs an at-most-one-per-job guarantee.
--
-- DEDUPE-FIRST, same discipline as every other constraint added this
-- session (tenant_domains primary invariant, clients pin unique): a partial
-- unique index added directly against live data that may already violate it
-- (the race being real and already exploitable) would just fail to apply.
-- Step 1 keeps exactly one row per job (oldest created_at, then lowest id
-- for a deterministic tie-break) and deletes the rest. Step 2 adds the
-- index.

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY job_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM job_events
  WHERE event_type = 'review_requested'
)
DELETE FROM job_events je
USING ranked
WHERE je.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_events_review_requested_once
  ON job_events (job_id)
  WHERE event_type = 'review_requested';
