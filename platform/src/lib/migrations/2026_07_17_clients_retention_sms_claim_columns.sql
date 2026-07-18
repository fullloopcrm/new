-- 2026_07_17_clients_retention_sms_claim_columns.sql
-- FILE ONLY — do NOT execute here. Leader runs after Jeff approves.
--
-- W1 fresh-ground finding (2026-07-17), direct continuation of tonight's
-- phone-fixup fix -- same notifications-scan-as-dedup shape, found by
-- continuing the same sweep. cron/retention gates its 30-90-day-lapsed
-- client SMS on TWO separate `notifications`-table SELECTs (a lifetime cap
-- of 3, and a 30-day cooldown), but the only `notifications` row that would
-- satisfy either check is inserted AFTER sendSMS() resolves. This cron runs
-- daily with no run-lock over up to 500 clients per tenant: two overlapping
-- invocations (a retried delivery, a manual re-trigger while a prior run is
-- still mid-flight) could both read zero matching rows for the same client
-- before either write landed, and both text the client "it's been a while."
--
-- Fix (code, same commit): two dedicated columns as the sole source of
-- truth, claimed together in ONE compare-and-swap UPDATE (both conditions
-- in the same WHERE clause) BEFORE sending, not after -- the losing
-- invocation's claim affects 0 rows and it skips before ever calling
-- sendSMS. The old notifications insert is kept as an audit trail only.
--
-- retention_sms_sent_at: NOT NULL DEFAULT epoch, same reasoning as
-- last_payment_followup_sent_at -- this is a repeating 30-day cooldown, not
-- a one-shot marker, so NULL can't mean "eligible" (a plain `.lt(cutoff)`
-- on a NULL column would never match in Postgres). The epoch default makes
-- `.lt(thirtyDaysAgo)` alone true for both a client's first eligible pass
-- and one whose last text has aged out of the cooldown.
--
-- retention_sms_count: NOT NULL DEFAULT 0, incremented on each successful
-- claim, checked via `.lt(3)` in the same UPDATE's WHERE clause as the
-- cooldown -- both the lifetime cap and the cooldown are enforced
-- atomically in one statement, not two separate pre-checks that can each
-- individually race their own write.
--
-- BACKFILL REQUIRED (unlike this session's other epoch-default columns):
-- retention_sms_count resetting to 0 for every client would let anyone
-- already at the lifetime cap of 3 receive up to 3 MORE retention texts
-- post-migration -- a real behavioral regression, not just a bounded
-- one-time duplicate. The companion backfill file recovers both columns
-- from the existing notifications history before this cap/cooldown
-- becomes the sole source of truth.

alter table clients
  add column if not exists retention_sms_sent_at timestamptz not null default '1970-01-01T00:00:00+00';

alter table clients
  add column if not exists retention_sms_count integer not null default 0;

comment on column clients.retention_sms_sent_at is
  'Last time cron/retention texted this client the 30-90-day lapsed-client SMS. Claimed via compare-and-swap (WHERE retention_sms_sent_at < thirtyDaysAgo AND retention_sms_count < 3, same UPDATE) before sending, not after -- replaces the old notifications-table 30-day-cooldown SELECT. Defaults to the epoch, never NULL, so the same `.lt()` comparison covers a client''s first attempt.';

comment on column clients.retention_sms_count is
  'Lifetime count of retention SMS sent to this client via cron/retention (max 3). Incremented atomically in the same compare-and-swap UPDATE as retention_sms_sent_at -- replaces the old notifications-table COUNT(*) SELECT, which raced its own write the same way.';
