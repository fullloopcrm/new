# Fixed: cron/schedule-monitor's own issue-insert was a check-then-insert race with no DB constraint

**From:** W1, 23:31 order item (1) (fresh-ground surface).
**Scope:** re-audited the last unswept cron/* routes not yet independently reviewed this session for the send/write-race class: comhub-email, generate-monthly-invoices, health-monitor, outreach, payment-reminder, rating-prompt, recurring-expenses, refresh-job-postings, schedule-monitor, system-check.

## Fixed

**`cron/schedule-monitor/route.ts`** — the "Dedup + write" step at the
bottom of the per-tenant loop reads every open/acknowledged
`schedule_issues.message` for the tenant into a `Set`, filters the
freshly-computed `issues` array down to ones not already in that set, then
INSERTs each survivor. That's a plain check-then-insert with **no DB
constraint behind it at all** — `schedule_issues` (supabase/smart_scheduling.sql)
has only two plain (non-unique) indexes on `status` and `tenant_id`.

This cron has `maxDuration=300` and loops every active tenant sequentially
inside one invocation — exactly the long-running, multi-tenant-fan-out shape
this session has repeatedly found gets retried by Vercel on a timeout
(the same risk class already fixed this session on
generate-monthly-invoices' booking-claim, comhub-email's inbound dedup,
job_events' review-request claim, etc.). Two overlapping invocations racing
the same tenant can both read the same empty `existingMessages` set before
either insert lands, and both write the identical `(tenant_id, message)`
issue row — a duplicate "double-booked" / "overlapping jobs" / "no car" /
etc. row on the admin schedule-issues dashboard. Lower blast radius than
this session's send-side races (no duplicate SMS/email, no financial
double-post) since it's admin-facing data integrity, not customer-facing or
accounting — but it's a real, currently-unguarded duplicate-write path, and
if an admin resolves one copy the duplicate stays open as a decoy.

This corrects an earlier ruling in this session's own
`w1-cron-scheduled-jobs-sweep-2026-07-17.md` sweep, which read
schedule-monitor for "new issues" and found none — that pass was checking
for the ET/UTC day-boundary correctness class (schedule-monitor already had
dedicated day-boundary tests), not the insert-dedup race on its own write
path, which nothing had independently exercised.

**Fix:**
- Migration `2026_07_17_schedule_issues_open_dedup_unique.sql` (file-only,
  not applied): dedupe-first (collapses any existing duplicate open/
  acknowledged `(tenant_id, message)` rows down to the oldest, marking the
  rest `resolved` with a note — nothing deleted, so any real admin
  resolution note on a duplicate survives), then adds a partial unique
  index `idx_schedule_issues_tenant_message_open_unique` on
  `(tenant_id, message) WHERE status IN ('open','acknowledged')`, scoped to
  exactly match the app's own dedup query. Includes a fail-loud verification
  block (same pattern as `2026_07_17_clients_pin_dedupe.backfill.sql`).
- `route.ts`: the insert loop now checks the insert's error for a
  duplicate-key hit (`code === '23505'`) and treats it as an idempotent
  no-op — lost the race to a concurrent/overlapping invocation, not a real
  failure — same pattern as `cron/comhub-email`'s 23505 handling on
  `comhub_messages`. `totalIssues` now counts actual successful inserts
  (`insertedForTenant`) instead of `newIssues.length`, so a lost race no
  longer inflates the reported count either.

**Verification:** new test
`route.duplicate-issue-race.test.ts` — two concurrent `GET` invocations
against a fake store with a `_addUniqueConstraint('schedule_issues',
'message')` (models the partial unique index; single-tenant test scope
makes a single-column constraint an exact stand-in for the real composite
`(tenant_id, message)` index) racing the same tenant/booking. RED-confirmed
via `git apply -R` on the source fix alone: 2 duplicate rows written, GREEN
after restoring (exactly 1 row, `new_issues` sums to 1 across both
responses). tsc clean on touched files (5 pre-existing unrelated baseline
errors elsewhere: stale `.next` admin-auth types, `cron/outreach` +
`cron/payment-reminder` pre-existing test-signature mismatches, untracked
`sunnyside-clean-nyc/site-nav.ts` — none touched by this fix). eslint: 0
errors on touched files (7 pre-existing warnings, all `no-explicit-any`/
unused-import in code this fix didn't add). Full suite: 613/613 files, 3287
passed + 1 pre-existing expected-fail, zero regressions (net +1 test).

## Continuation — same file opened up a second, related race

**`cron/schedule-monitor/route.ts`'s NYC Maid self-healing reconcile** (the
block right above the insert fix, still inside the per-tenant loop): reads
every open/acknowledged `schedule_issues` row, computes which are stale
(past-dated or no longer in the freshly-computed set), then bulk-UPDATEs
those ids straight to `status:'resolved', resolved_by:'auto'` — with **no
re-check of the row's current status at write time**. `PUT
/api/admin/schedule-issues` lets an admin explicitly set a row to
`'dismissed'` (a deliberate "not a real issue" call, distinct from an
auto-resolve) at any moment. An admin dismissal landing in the gap between
the reconcile's SELECT and its UPDATE got silently overwritten back to
`'resolved'`/`resolved_by:'auto'`, erasing the admin's explicit call with no
error or signal — same overwrite-race class as this session's
`cron/lifecycle` and `cron/generate-recurring` fixes (blind UPDATE
clobbering a concurrent admin status edit).

**Fix:** the reconcile UPDATE now re-checks `.in('status', ['open',
'acknowledged'])` in its own WHERE (matching what was true at SELECT time),
so a status change to anything else in the gap makes the row no longer
match and the bulk update becomes a no-op for it — the admin's dismissal
wins. No migration needed (no new constraint, just a stricter application
WHERE clause).

**Verification:** new test `route.reconcile-dismiss-race.test.ts` — mocks
the fake store so a concurrent admin dismissal of `issue-1` is simulated
exactly in the gap between the reconcile's SELECT and its UPDATE call (same
technique as this session's no-show-check/health-check race tests: intercept
at the specific write call, mutate the row, then let the real write
proceed). RED-confirmed via a temporary revert of just this hunk (row ended
up `'resolved'`/`resolved_by:'auto'`, clobbering the dismissal exactly as
predicted), restored GREEN. Included in the same full-suite/tsc/eslint pass
above: 614/614 files, 3288 passed + 1 pre-existing expected-fail (net +2
tests total this round), zero regressions.

## Checked, ruled clean this round

- **comhub-email, generate-monthly-invoices, outreach, payment-reminder,
  rating-prompt**: all already carry an explicit claim-before-send /
  claim-before-write fix (with an inline comment naming the prior fix and
  bug class) from earlier this session. Re-read in full; no new gap found.
- **recurring-expenses**: its own check-then-act (`journal_entries`
  already-posted SELECT, then `postJournalEntry()`) looked like the same
  race class at first read, but `postJournalEntry` → the `post_journal_entry`
  RPC (migration 064) already enforces `(tenant_id, source, source_id)`
  uniqueness at the DB level and returns `NULL` on conflict instead of
  throwing/duplicating — so a lost race there is already a real no-op, not a
  double-post. The follow-on `recurring_expenses.next_due_date` advance is
  computed from the same pre-race `next_due_date` value in both racing
  invocations, so a "duplicate" write there lands on the identical value —
  no corruption, just redundant work. Clean.
- **health-monitor, system-check, refresh-job-postings**: read-only
  diagnostics / cache revalidation, no write race surface. Clean.

## Not yet independently swept

comms-monitor, email-monitor, anthropic-health, backup, jefe-heartbeat,
tenant-health, sync-google-reviews, auto-reply-reviews, cleanup-videos,
daily-summary, follow-up, generate-recurring, health-check, late-check-in,
lifecycle, no-show-check, payment-followup-daily, phone-fixup,
post-job-followup, reminders, retention, sales-follow-ups,
confirmation-reminder, confirmations — all already independently fixed or
ruled clean earlier this session per LEADER-CHANNEL; not re-touched this
round.
