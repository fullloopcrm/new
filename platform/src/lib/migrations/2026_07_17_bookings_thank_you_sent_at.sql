-- 2026_07_17_bookings_thank_you_sent_at.sql
-- W1 fresh-ground finding (2026-07-17). cron/follow-up's dedup was a
-- substring marker in bookings.notes ('[THANKYOU_SENT] <iso>'), checked
-- client-side against a row read earlier in the invocation and written to
-- `notes` AFTER notify() resolved. Same two-bug shape already fixed this
-- session on post-job-followup's review_followup_sent_at column:
--   1. Race: sent-before-claim -- an overlapping invocation (manual
--      re-trigger of this endpoint, or a platform-retried cron delivery)
--      could read the same not-yet-marked booking and double-send the
--      "thank you + 10% off" email before either write landed.
--   2. Silent resend, no race required: `notes` is in PATCH
--      /api/bookings/:id's allowed field list, so ANY admin edit after
--      checkout overwrites the whole field and erases the marker, causing a
--      duplicate thank-you email on the next 3-day-window cron pass with no
--      concurrency involved.
--
-- Fix (code, same commit): a dedicated timestamptz column as the sole
-- source of truth, claimed via a compare-and-swap UPDATE ... WHERE
-- thank_you_sent_at IS NULL BEFORE the send (not after). notes still gets
-- the human-readable [THANKYOU_SENT] marker appended in the same atomic
-- write (parity with post-job-followup), but it is no longer read back for
-- dedup.
--
-- Nullable, no default needed -- NULL is the permanent, valid "not yet
-- sent" state for the lifetime of this column, same as
-- review_followup_sent_at / confirmation_reminder_sent_at.

alter table bookings
  add column if not exists thank_you_sent_at timestamptz;

comment on column bookings.thank_you_sent_at is
  'Set once cron/follow-up sends the 3-day post-service thank-you email. Claimed via compare-and-swap (WHERE thank_you_sent_at IS NULL) before sending, not after -- replaces the old notes-text [THANKYOU_SENT] marker, which both raced and was silently erased by any later notes edit via PATCH /api/bookings/:id.';
