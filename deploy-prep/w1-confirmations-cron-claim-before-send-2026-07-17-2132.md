# W1 — cron/confirmations: 3 sent-before-claim / check-then-insert races closed

**Date:** 2026-07-17 21:32 ET
**Worker:** W1 (schema + backfill lane, tenant_domains)
**Files:** file-only, no push/deploy/DB command run

## Background

Twice this session (18:35, 21:23 rounds), `cron/confirmations` was flagged as
having the same sent-before-claim ordering already closed on 6+ other crons
this session, but explicitly deferred as lower severity ("hourly-repeating
reminder w/ 55min throttle already"). That assessment only looked at the
file's TEAM branch. On closer read the file has **three** independent
check-then-insert races, not one, of meaningfully different severity.

## What was broken

`src/app/api/cron/confirmations/route.ts` has two top-level branches plus a
nested admin-alert path, all sharing the same shape: SELECT for an existing
dedup marker, and only insert/write that marker **after** the SMS/insert
fires — not before. The cron loops every active tenant with no run-lock, so
two overlapping invocations (a Vercel cron retry/duplicate trigger, the same
risk class already observed and exploited elsewhere this session) can both
read the same "not yet sent" state before either write lands.

1. **TEAM branch** (resend hourly until confirmed): dedup SELECTed the most
   recent `team_confirm_request` notification, throttled to 55 min, but the
   claim row was inserted after `sendSMS()`. Narrowed by the throttle, not
   closed by it — a real race window exists on every overlapping invocation
   within the same ~hour.

2. **CLIENT branch** (day-before confirmation, gated to the single 1pm ET
   hour): dedup SELECTed for an existing `client_confirm_request`
   notification, same after-the-send insert. **This is the more severe of
   the two** — one-shot, no throttle, and gated to the exact ET hour the
   whole tenant's tomorrow-scheduled bookings all become eligible at once.
   A lost race here duplicate-texts every one of them simultaneously, the
   highest-fan-out moment in the file. This is the branch the prior "lower
   severity" assessment didn't separately evaluate.

3. **Admin no-confirm alert** (nested in the TEAM branch, fires on the 3rd+
   unconfirmed attempt): SELECTed for an existing `team_no_confirm_alert`
   row in a rolling 24h window, inserted only if none found — same
   check-then-insert shape, discovered as a direct continuation of fixing
   branch 1 in the same file. Lower severity (in-app admin notification, not
   a customer-facing text), but the same real bug: two overlapping
   invocations on the same booking's 3rd+ attempt could both pass the check
   and both insert, double-alerting the admin.

## Fix

All three now claim via a compare-and-swap `UPDATE ... WHERE <condition>`
on `bookings` **before** sending/inserting, same pattern as this session's
other claim-before-send fixes (confirmation-reminder, payment-followup-daily,
post-job-followup, late-check-in, reminders):

- `team_confirm_request_sent_at` — repeating claim (NOT NULL DEFAULT epoch,
  `.lt(throttleCutoff)`), same shape as `last_payment_followup_sent_at`.
  Legitimately resends every hour, so can't use a plain unique index.
- `client_confirm_request_sent_at` — one-shot claim (nullable, `.is(null)`),
  same shape as `confirmation_reminder_sent_at`.
- `team_no_confirm_alert_sent_at` — repeating claim (NOT NULL DEFAULT epoch,
  `.lt(24h-ago)`), same reasoning as the team-confirm column.

The `notifications` inserts for branches 1/2 are kept as an audit trail /
attempt-counter only (branch 1's own 3rd-attempt count still reads them);
branch 3's insert is the actual admin-visible artifact, now gated on its
claim succeeding rather than a race-prone pre-check.

Migration (file-only, **not applied**, no DB command run):
`src/lib/migrations/2026_07_17_bookings_confirmations_claim_columns.sql` —
adds all three columns with no backfill needed (new columns, not a
uniqueness constraint against existing data — nothing to dedupe first).
Documented known, accepted one-time side effect: since there's no backfill
from prior notification history, the first cron run after this migration
lands may send one extra confirm-request per currently-affected booking
(bounded, non-repeating — same class of effect the payment-followup-daily
column introduced without issue).

## Verification

- 14 new tests in `route.claim-before-send.test.ts` (3 describe blocks: team
  branch, client branch, admin-alert branch), covering: claim-writes-before-
  send ordering, concurrent-invocation-only-sends-once, throttle/window
  respected, throttle/window expiry re-enables, and (team branch) no-send
  once already confirmed.
- Mutation-verified: `git diff > patch`, `git apply -R` to fully revert
  `route.ts` to pre-fix state, re-ran the new test file — **11 of 14 tests
  failed** with the exact predicted duplicate-send/double-alert symptoms
  (the 3 that passed are the throttle/window-already-expired cases, which
  don't depend on ordering). Restored via `git apply`, confirmed GREEN
  again (17/17 in the file's 3 test files combined).
- `tsc --noEmit`: clean on touched files (4 pre-existing unrelated baseline
  errors elsewhere: admin-auth route generated-types quirk, 2 known
  pre-existing test-file signature mismatches in outreach/payment-reminder,
  and another worker's untracked sunnyside-clean-nyc site-nav.ts).
- `eslint`: 0 errors on touched files (1 pre-existing-pattern warning,
  `_args` unused in a mock signature — same convention used in every other
  claim-before-send test this session).
- Full suite: 601/601 files, 3240 passed + 1 pre-existing expected-fail
  (same one flagged all session by other workers), 0 regressions (net +14
  tests vs. the 21:23 baseline of 3226).

## Not touched / flagged

- `tenant_domains` schema lane (043/055/056/068/069/primary-invariant/
  domain-normalization/vercel-registration) reconfirmed intact — this
  round's fixes are entirely in `bookings`/`notifications`, outside that
  table, no drift.
- No further sent-before-claim races found in `cron/confirmations` — all
  three write paths in the file are now claim-gated.
