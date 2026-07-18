# W1 — cron/no-show-check + cron/health-check: check-then-blind-write status races, one with real data loss

**Date:** 2026-07-17 22:00 ET
**Worker:** W1 (schema + backfill lane, tenant_domains)
**Files:** file-only, no push/deploy/DB command run

## Background

Fresh-ground surface this round: audited every `cron/*` route that flips
`bookings.status` via a write (`update({ status: ... })` grep across
`src/app/api/cron/`) for the same claim-before-write discipline this
session's other rounds already established on the *send* side
(confirmations/reminders/late-check-in/post-job-followup/etc). Two of the
six matches — `no-show-check` and `health-check` — flip booking status off
a candidate SELECT taken earlier in the same request, then write with only
an `id`/`tenant_id` filter, never re-asserting the condition that made the
row a candidate in the first place. (The other four —
`release-due-payments`, `lifecycle`, `generate-recurring`, and
`health-check`'s own notification-status writes — either update a
different table with no live-writer race exposure or already scope by a
freshly-read id set with no intervening candidate-vs-write gap; not
touched.)

## What was broken

### 1. `cron/no-show-check` — real check-in silently reverted to no-show

Runs every 15 min, processes up to 500 candidate bookings **sequentially**
in a `for` loop, each iteration doing an UPDATE + a `notify()` call (email/
push round-trip). The candidate SELECT filters `status IN (scheduled,
confirmed, pending)` and `check_in_time IS NULL`, but the per-row UPDATE
only carried `.eq('id', b.id).eq('tenant_id', b.tenant_id)` — no re-check
of either condition. A team member genuinely checking in
(`team-portal/checkin`, which sets `check_in_time` + `status='in_progress'`)
in the gap between the SELECT and that specific row's turn in the loop —
trivially possible on a batch of up to 500, since check-in isn't blocked on
this cron — got silently overwritten back to `'no_show'`. `no_show` status
feeds the calendar, `finance/cash-flow`, `team-availability`, and
`admin/analytics`, so this wasn't cosmetic: a legitimately in-progress or
completed booking's status could revert to a wrong terminal state with no
trace of why.

### 2. `cron/health-check` — same race, plus real notes data loss

Runs every 15 min, section 5 ("BOOKINGS WITH STALE STATUS") finds bookings
`status='in_progress'` with `end_time` 4+ hours in the past and
bulk-updates them: `update({ status:'completed', notes: '[Auto-completed...]' })
.in('id', ids)`. Two independent bugs on this one write:

- **Data loss (unconditional, not just a race):** `notes` was set to a
  fixed literal, **replacing** whatever was already in the column. Every
  other write path on this exact column (`team-portal/checkin`'s GPS-flag
  append: `(booking.notes || '') + checkInFlagNote`) appends; this one
  didn't. Any real content already on the booking — arrival details,
  damage reports, client instructions — was destroyed for every stale
  booking this section ever auto-completed, unconditionally, not just on a
  race.
- **Check-then-act race:** same shape as (1) — the bulk UPDATE re-checked
  nothing but `id`, so a genuine checkout landing between the SELECT and
  the UPDATE got its real completion silently overwritten with a
  fabricated system note (compounding the data-loss bug above).

## Fix

Both now re-assert the exact condition that made the row a candidate
inside the UPDATE's own WHERE, and check whether the claim actually landed
(`.select('id').maybeSingle()`) before proceeding — a lost race is a
no-op, not a corruption:

- `no-show-check`: `.in('status', [...]).is('check_in_time', null)` added
  to the flip UPDATE; skips `notify()` on a lost claim.
- `health-check`: switched the bulk `.in('id', ids)` update to a per-row
  loop (needed anyway once notes must be appended per-row, since each
  booking's existing notes differ), added `.eq('status', 'in_progress')`
  to each row's WHERE, and changed `notes` to
  `` `${b.notes || ''}\n\n[Auto-completed by system — end time passed]`.trim() ``.

No migration needed — no new columns, no backfill, pure write-guard fixes.

## Verification

- `no-show-check`: new `route.claim-before-write-race.test.ts` (2 tests) —
  a getter-based store interception lands the simulated check-in on the
  UPDATE's own store access (the 2nd read of `bookings`, matching the
  route's actual access pattern: 1 candidate SELECT + 1 per-row UPDATE),
  proving the race is closed; a second test proves a genuine no-show still
  flips + notifies exactly once. Existing `route.day-boundary.test.ts` (2
  tests) still green.
- `health-check`: new `route.stale-booking-notes-and-race.test.ts` (2
  tests, first test file this route has ever had) — proves notes are
  appended not destroyed, and proves the same getter-based race
  interception (2nd `bookings` access = the per-row claim UPDATE) leaves a
  genuinely-checked-out booking's real status/notes untouched.
- Mutation-verified both: `git diff > patch` per file, `git apply -R` to
  revert each `route.ts` to its exact pre-fix state, re-ran — **all 4 new
  tests failed** for the predicted reason (no-show-check: `flipped` came
  back 1 instead of 0, notify called; health-check: notes literal replaced
  the seeded text, race test's notes/status got clobbered). Restored via
  `git apply`, re-confirmed GREEN.
- `tsc --noEmit`: clean on both touched route files and both new test
  files (0 new errors). Pre-existing baseline noise only, unrelated to
  this change: stale `.next` admin-auth generated types, 2 known
  pre-existing test-signature mismatches (`cron/outreach`,
  `cron/payment-reminder`), and another worker's untracked
  `sunnyside-clean-nyc/_lib/site-nav.ts`.
- Full suite: 603/603 files, 3244 passed + 1 pre-existing expected-fail
  (same one flagged all session by other workers), 0 regressions (net +4
  tests vs. the pre-round baseline of 602/3242+1).
- Committed `5c04db08`, file-only (4 files: 2 route.ts + 2 new test
  files), no push/deploy/DB.

## Not touched / flagged

- `tenant_domains` schema lane (043/055/056/068/069/primary-invariant/
  domain-normalization/vercel-registration) reconfirmed intact — this
  round's fixes are entirely in `bookings`, outside that table, no drift.
- Checked the other 4 `cron/*` files matching `update({ status` and ruled
  them clean for this specific bug class: `release-due-payments`
  (`job_payments`, single query no candidate/write split),
  `lifecycle`/`generate-recurring` (`clients`/`recurring_schedules`
  status transitions driven by fresh aggregate queries, no narrow
  candidate-then-write gap of the kind exploited here),
  `health-check`'s own `notifications`-table writes (sections 1/3, dedup
  by `id` off a just-read row with no external actor racing a
  `notifications` row's status).
- `schedule-monitor`'s `schedule_issues.update({status:'resolved',...})`
  self-healing reconcile is a different table/shape (bulk `.in('id',
  staleIds)` off a freshly-computed stale-id set with no external writer
  ever touching `schedule_issues.status` concurrently) — not the same bug
  class, not fixed.
