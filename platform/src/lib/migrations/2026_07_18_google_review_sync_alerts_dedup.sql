-- 2026_07_18_google_review_sync_alerts_dedup.sql
-- FILE ONLY -- do NOT execute here. Leader runs after Jeff approves.
--
-- WHY: cron/sync-google-reviews (src/app/api/cron/sync-google-reviews/route.ts)
-- computed "new reviews this run" via a per-review check-then-act (SELECT
-- google_reviews for the review id, upsert unconditionally, count as new if
-- the SELECT found nothing), then fired an unconditional `notifications`
-- insert ("N new Google reviews") once per tenant whenever newReviews > 0 --
-- no DB constraint behind the count. Two overlapping invocations for the
-- same tenant (a slow round-trip across many paginated review fetches
-- bleeding into the next tick, a manual re-trigger) can both read the same
-- not-yet-synced reviews as "new" before either upsert commits, and both
-- fire a duplicate "N new reviews" notification for the identical batch --
-- a tenant-visible dashboard notification doubling, same check-then-act
-- race class this session has repeatedly found and fixed (cron/comms-monitor,
-- cron/schedule-monitor, every webhook redelivery-dedup pass).
--
-- A review's `google_review_id` is permanently written to `google_reviews`
-- by the very same upsert this cron just ran, so the identical fingerprint
-- (tenant + exact set of newly-seen review ids) reappearing after the race
-- window closes is structurally unreachable -- same ephemeral-fingerprint
-- reasoning as comms-monitor's fix. A plain permanent unique constraint is
-- therefore correct (no reclaim-if-stale needed, unlike health-monitor's
-- stable-set fingerprint).
--
-- Fix (code, same commit): insert-first claim into this new table BEFORE
-- the notifications insert -- a unique violation on fingerprint means
-- another invocation already claimed (and is notifying for) this exact
-- new-review batch, so the loser skips as an idempotent no-op.
--
-- No backfill needed -- brand-new table, nothing to dedupe retroactively.

CREATE TABLE IF NOT EXISTS google_review_sync_alerts (
  fingerprint text PRIMARY KEY,
  alerted_at timestamptz NOT NULL DEFAULT now()
);
