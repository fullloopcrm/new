-- 2026_07_17_team_members_phone_fix_email_sent_at.sql
-- FILE ONLY — do NOT execute here. Leader runs after Jeff approves.
--
-- W1 fresh-ground finding (2026-07-17). cron/phone-fixup's pre-send dedup
-- scanned `notifications` for type='phone_fix_email' rows within the last 7
-- days and regex-parsed `cleaner_id=...` out of the message text to build a
-- skip-set, but that notification row is only inserted AFTER sendEmail()
-- resolves. Same sent-before-claim race already fixed elsewhere this
-- session (confirmation-reminder/payment-followup-daily/rating-prompt/etc):
-- this cron has no run-lock, so two overlapping invocations (a retried cron
-- delivery, a manual re-trigger while a prior run is still mid-flight
-- emailing up to CAP=10 cleaners per tenant) could both read zero matching
-- notifications rows for the same cleaner before either write landed, and
-- both email that cleaner the "confirm your phone" link.
--
-- Fix (code, same commit): a dedicated timestamptz column as the sole
-- source of truth, claimed via compare-and-swap (`WHERE
-- phone_fix_email_sent_at < sevenDaysAgo`) BEFORE sending, not after, so an
-- overlapping invocation's claim affects 0 rows and it skips. The old
-- notifications insert is kept as an audit trail only.
--
-- Repeatable like last_payment_followup_sent_at (this cron re-emails every
-- 7 days until the phone is fixed, not a one-shot marker) -- NOT NULL
-- DEFAULT epoch so the same `.lt(sevenDaysAgo)` comparison covers both a
-- cleaner's first-ever eligible pass and one whose last email has aged out
-- of the 7-day window (a NULL column would never match `.lt()`, since NULL
-- comparisons are NULL, not true, in Postgres).

alter table team_members
  add column if not exists phone_fix_email_sent_at timestamptz not null default '1970-01-01T00:00:00+00';

comment on column team_members.phone_fix_email_sent_at is
  'Last time cron/phone-fixup emailed this cleaner the phone-confirmation link. Claimed via compare-and-swap (WHERE phone_fix_email_sent_at < sevenDaysAgo) before sending, not after -- replaces the old notifications-scan + message-regex dedup, which only ever matched a write from a PRIOR run (the current run''s own insert always lands after the check). Defaults to the epoch, never NULL, so the same `.lt()` comparison covers a cleaner''s first attempt.';
