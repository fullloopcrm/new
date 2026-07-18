-- 2026_07_17_notifications_late_alert_unique.sql
-- W1 fresh-ground finding (2026-07-17), continuation of the
-- post-job-followup claim-before-send pass (same session, same bug class).
--
-- cron/late-check-in's LATE CHECK-IN and LATE CHECK-OUT branches both dedup
-- by checking for an existing `notifications` row (tenant_id, booking_id,
-- type) BEFORE sending, but fire the team/admin SMS (fire-and-forget,
-- `.catch(()=>{})`, not even awaited) and THEN insert the notifications row
-- that is supposed to be the dedup record -- with no constraint backing it.
-- Two overlapping invocations (this cron loops every active tenant with no
-- run-lock, same shape as payment-reminder/outreach/post-job-followup) could
-- both read zero existing notifications for the same late booking and both
-- fire team+admin SMS. Same bug class + fix shape as this session's other
-- claim-before-send fixes.
--
-- Fix (code, same commit): insert the notifications row FIRST -- this
-- partial unique index is the atomic claim -- and only send if that insert
-- succeeds.
--
-- Partial (not a plain unique(tenant_id, booking_id, type)): `notifications`
-- is a general-purpose table used by many features for many types; only
-- late_check_in/late_check_out need an at-most-one-per-booking guarantee
-- (a booking is a single scheduled slot -- it cannot legitimately go late
-- twice under the same type).
--
-- DEDUPE-FIRST, same discipline as every other constraint added this
-- session (tenant_domains primary invariant, clients pin unique, job_events
-- review_requested): a partial unique index added directly against live
-- data that may already violate it (the race being real and already
-- exploitable) would just fail to apply. Step 1 keeps exactly one row per
-- (tenant_id, booking_id, type) (oldest created_at, then lowest id for a
-- deterministic tie-break) and deletes the rest. Step 2 adds the index.

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY tenant_id, booking_id, type
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM notifications
  WHERE type IN ('late_check_in', 'late_check_out')
    AND booking_id IS NOT NULL
)
DELETE FROM notifications n
USING ranked
WHERE n.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_late_alert_once
  ON notifications (tenant_id, booking_id, type)
  WHERE type IN ('late_check_in', 'late_check_out') AND booking_id IS NOT NULL;
