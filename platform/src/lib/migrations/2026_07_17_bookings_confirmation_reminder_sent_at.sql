-- 2026_07_17_bookings_confirmation_reminder_sent_at.sql
-- W1 fresh-ground finding (2026-07-17). cron/confirmation-reminder's pre-send
-- dedup queried sms_logs for sms_type='confirmation_reminder' (SELECT count,
-- continue-if-any), but the only write of that row happens inside
-- lib/nycmaid/sms.ts's sendSMS() -- AFTER the Telnyx call resolves. Same
-- sent-before-claim race already fixed this session on
-- rating-prompt/payment-reminder/post-job-followup/late-check-in/reminders:
-- this cron runs every 5 min with no run-lock, so two overlapping
-- invocations could both read zero matching sms_logs rows before either
-- write landed, and both text the client asking them to confirm.
--
-- Fix (code, same commit): a dedicated timestamptz column as the sole
-- source of truth, claimed via a compare-and-swap UPDATE ... WHERE
-- confirmation_reminder_sent_at IS NULL BEFORE the send (not after), so an
-- overlapping invocation's claim affects 0 rows and it skips.
--
-- Nullable, no default needed -- NULL is the permanent, valid "not yet
-- sent" state for the lifetime of this column, same as
-- review_followup_sent_at (2026_07_17_bookings_review_followup_sent_at.sql).

alter table bookings
  add column if not exists confirmation_reminder_sent_at timestamptz;

comment on column bookings.confirmation_reminder_sent_at is
  'Set once cron/confirmation-reminder sends the pending-booking confirmation-request SMS. Claimed via compare-and-swap (WHERE confirmation_reminder_sent_at IS NULL) before sending, not after -- replaces the old sms_logs count-check, which queried sms_type=confirmation_reminder before that row was ever written (write happens post-send inside sendSMS), so it never actually matched its own writes.';
