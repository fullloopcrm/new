-- 2026_07_17_bookings_review_followup_sent_at.sql
-- W1 fresh-ground finding (2026-07-17). cron/post-job-followup used a
-- substring marker in bookings.notes ('[FOLLOWUP_SENT] <iso>') as BOTH its
-- dedup source-of-truth for the standalone-booking review-request SMS AND a
-- free-text field admins routinely edit via PATCH /api/bookings/:id (notes
-- is in that route's allowed field list). Two independent bugs from one
-- design flaw:
--   1. Race: the marker was written to `notes` AFTER sendSMS(), not before
--      -- checked client-side against a row already read earlier in the
--      same invocation. An overlapping cron invocation could read the same
--      not-yet-marked booking and double-text the client. Same bug class
--      already fixed this session on
--      rating-prompt/comhub-email/payment-reminder/outreach.
--   2. Silent resend, no race required: ANY admin edit to a booking's notes
--      after checkout (fixing a typo, adding an unrelated note) overwrites
--      the whole field via that PATCH route, erasing the marker with zero
--      relation to whether the SMS was actually sent -- the client gets a
--      second, unprompted review request on the next cron pass. This one
--      needs no concurrency at all to trigger and is likely the more common
--      real-world hit of the two.
--
-- Fix (code, same commit): a dedicated timestamptz column as the sole
-- source of truth, claimed via a compare-and-swap UPDATE ... WHERE
-- review_followup_sent_at IS NULL BEFORE the send (not after), so an
-- overlapping invocation's claim affects 0 rows and it skips. Immune to
-- notes edits since nothing else ever writes this column.
--
-- Nullable, no default needed -- NULL is the permanent, valid "not yet
-- sent" state for the lifetime of this column (unlike the tenant_domains
-- P1-SCHEMA-SPEC columns, there is no later NOT NULL/enforce phase here).

alter table bookings
  add column if not exists review_followup_sent_at timestamptz;

comment on column bookings.review_followup_sent_at is
  'Set once cron/post-job-followup sends the standalone-booking review-request SMS. Claimed via compare-and-swap (WHERE review_followup_sent_at IS NULL) before sending, not after -- replaces the old notes-text [FOLLOWUP_SENT] marker, which both raced and was silently erased by any later notes edit.';
