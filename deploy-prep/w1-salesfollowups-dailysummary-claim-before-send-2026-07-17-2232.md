# W1 — cron/sales-follow-ups + cron/daily-summary: two claim-before-send/scoping bugs closed

**Date:** 2026-07-17 22:32 ET
**Worker:** W1 (schema + backfill lane, tenant_domains)
**Files:** file-only, no push/deploy/DB command run

## Background

Fresh-ground pass. `cron/sales-follow-ups` was explicitly flagged as a
known-not-fixed item in the previous round
(`w1-followup-thankyou-claim-before-send-2026-07-17-2214.md`'s "Not
touched / flagged for a future round" section: "same select-then-
insert-if-unmatched dedup shape... previously flagged in the 16:30 sweep
as lower blast radius, not fixed"). Picked it up this round and, while
fixing it, found a second instance of the same bug class one file over in
`cron/daily-summary`'s recurring-expiration warning — worse than a plain
race, since it also silently starved unrelated schedules of their warning
entirely.

Both fixes needed a new column-design variant not used elsewhere this
session: every prior `_sent_at` column was a one-shot NULL-means-pending
marker on an immutable event (a booking only checks out once). These two
surfaces are **resettable/repeatable by design** — a deal's follow-up date
is admin-editable, and the expiration warning is meant to resend every 7
days — so a plain NULL claim doesn't fit. Both use a fixed epoch sentinel
default instead of NULL, documented in each migration.

## Fix 1 — cron/sales-follow-ups (commit 6afdbc3e)

**Bug:** dedup queried `notifications` for a `type = 'follow_up'` row
created in the last hour, matched by `metadata.deal_id`, THEN looped
matching deals and called `notify()`/SMS unconditionally — check-then-act,
same class as every other fix this session. Two overlapping invocations
(retried cron delivery, manual re-trigger) could both read zero "existing"
rows and double-notify the admin.

**Fix:** new `deals.follow_up_notified_at timestamptz not null default
'1970-01-01T00:00:00Z'` (migration
`2026_07_17_deals_follow_up_notified_at.sql`, file-only). Claimed via
compare-and-swap (`.neq('follow_up_notified_at', deal.follow_up_at)`)
BEFORE `notify()`. `PATCH /api/deals/[id]` and `PUT /api/deals` both reset
the column back to the sentinel whenever `follow_up_at` is written, so a
reschedule re-arms the reminder for the new due date — the epoch sentinel
(not NULL) is what makes the `<>` comparison actually match a
never-notified row in real Postgres (`NULL <> x` is unknown, not true;
`<>` against a real non-null sentinel value works correctly).

## Fix 2 — cron/daily-summary recurring_expiring (commit 76c02221)

**Bug, worse than a race:** the 30-day recurring-expiration warning's
dedup checked `notifications` for ANY `type = 'recurring_expiring'` row
in the **whole tenant** within the last 7 days — not scoped to which
schedule the warning was for. Any tenant with more than one schedule
nearing expiration around the same time (a common real pattern — clients
who signed up together) would only ever get ONE schedule's warning; every
other schedule's expiration silently never notified, reproducing
single-threaded on every run, no concurrency needed. The check-then-insert
shape also raced two overlapping invocations into a double-send for the
same schedule.

**Fix:** new `recurring_schedules.expiring_last_notified_at timestamptz
not null default '1970-01-01T00:00:00Z'` (migration
`2026_07_17_recurring_schedules_expiring_notified_at.sql`, file-only).
Claimed via compare-and-swap (`.lt('expiring_last_notified_at', now - 7
days)`) BEFORE `notify()`, scoped per-schedule — fixes both the scoping
bug and the race. The `notifications` insert stays afterward, unchanged,
since the admin dashboard's history feed already reads
`type = 'recurring_expiring'` for display. Sentinel default again, so the
"never notified OR notified >7 days ago" claim is a single `<` comparison
instead of an OR of two conditions.

## Why the sentinel design (not this session's usual NULL convention)

Both PostgREST `.or()` support and Postgres's own `NULL <> x` semantics
make a nullable "not yet sent" column awkward for a **resettable** claim
(deals) or a **time-windowed resend** claim (recurring_schedules) — vs. a
plain `.is(col, null)` claim, which is all this session's other
`_sent_at` columns (immutable one-shot booking events) ever needed. The
fake test harness's `.or()` is also a documented no-op (`fake-
supabase.ts` header), which would make a real OR-based claim untestable
against it — the epoch-sentinel + single-comparison design sidesteps that
without touching shared test infra.

## Verification

- New `route.claim-before-send-race.test.ts` for both crons (4 tests
  each): proves exactly-once notify under `Promise.all` concurrency,
  proves the claim column is set BEFORE `notify()` is called (not after,
  via a `notify` mock inspecting store state at call time), proves no
  re-notify on a repeat pass, and proves the resettable/resend behavior
  each fix is designed for (deal reschedule re-arms; 7-day-stale schedule
  re-warns).
- Updated `daily-summary/route.test.ts`'s existing seed to include the new
  `expiring_last_notified_at` sentinel (required — the fake's `.lt()`
  excludes an `undefined` cell, so an un-updated seed would have made the
  4 pre-existing tests in that file false-fail against the new claim).
  Ran that file alongside the new one to confirm no regression.
- RED-confirmed both: `git stash` on just the route.ts changes (not the
  new test files) reproduced 3/4 and 3/4 failures respectively against
  the OLD code, then `git stash pop` restored the fix and both suites
  went green again. Not `git apply -R` this round since two of the
  four changed files per fix are new/untracked (the test files
  themselves) — stashing only the tracked route.ts file isolates the
  fix from the test without disturbing the new test file.
- `npx tsc --noEmit`: introduced and fixed two arity-mismatch errors of my
  own making in the new test files (mock functions declared with 0 params
  called with 1 arg) before the final check — 0 errors in any touched or
  new file. Same pre-existing baseline noise as every prior round (stale
  `.next` admin-auth types, `cron/outreach`/`cron/payment-reminder`
  pre-existing test-signature mismatches, another worker's untracked
  `sunnyside-clean-nyc/_lib/site-nav.ts`).
- `npx eslint` on all touched/new files: 0 errors (2 pre-existing-style
  `_`-prefixed unused-param warnings in the new sales-follow-ups test,
  same convention as `_request` elsewhere in this codebase).
- `npx vitest run src/app/api/cron/daily-summary/ src/app/api/cron/sales-follow-ups/ src/app/api/deals/`:
  12 files, 38/38 passed.
- Full `npx vitest run` kicked off as a non-gating background follow-up
  after both commits landed (not a gate before committing, per the
  leader's 19:01 correction on holding commits for the full suite).

## tenant_domains schema lane

Reconfirmed intact, no drift — both fixes this round are in `deals` and
`recurring_schedules`, outside that table.

## Not touched / flagged for a future round

- **`cron/retention`** — same check-then-insert shape (queries
  `notifications` for a recent/total-count gate, then sends SMS, then
  inserts the claim row after). Not fixed this round: its dedup is
  genuinely more complex (up to 3 lifetime sends per client, 30-day
  resend spacing, AND a lifetime cap all in one gate) and deserves its own
  pass rather than being folded in here.
- **`cron/auto-reply-reviews`** — still not independently re-audited,
  same as the last two rounds' notes (delegates to
  `lib/google-reviews.ts`'s `autoReplyReviews()`, presumed self-dedup via
  "unreplied" state).
