# cron/sync-google-reviews + cron/tenant-health had no dedup behind their alerts (2026-07-18 02:01)

## Fresh-ground discovery (LEADER item 1)

Swept the remaining unswept crons for the check-then-act/no-dedup alert
class this session has repeatedly found (cron/comms-monitor,
cron/health-monitor, every webhook redelivery-dedup pass). Cross-referenced
every `src/app/api/cron/*` directory against this session's commit history
(`git log --oneline --all | grep "fix(P1/W1)"`) to find directories never
touched by a fix commit, then read each candidate. Almost everything had
already been swept; `cron/sync-google-reviews` (nightly, `0 3 * * *`) was the
one remaining match for the exact "count new items during a check-then-act
loop, then fire an unconditional summary notification" shape: per review, it
SELECTs `google_reviews` for the `google_review_id`, upserts unconditionally,
and counts the review as new if the SELECT found nothing — then fires a
`notifications` insert ("N new Google reviews") once per tenant if any were
new, no DB constraint behind the count. Two overlapping invocations for the
same tenant (a slow round-trip across many paginated review fetches
bleeding into the next night's tick, a manual re-trigger) can both read the
same not-yet-synced reviews as "new" before either upsert commits, and both
fire a duplicate "N new reviews" notification for the identical batch — a
tenant-visible dashboard notification doubling, not just an internal ops
alert.

**Fix:** insert-first claim on a new `google_review_sync_alerts(fingerprint)`
table before the `notifications` insert — fingerprint = tenant id + sorted
new review ids. A review's id is permanently written to `google_reviews` by
the very same upsert this cron just ran, so the identical fingerprint
reappearing after the race window closes is structurally unreachable — same
ephemeral-fingerprint reasoning as `comms-monitor`'s fix, so a plain
permanent unique constraint is correct (no reclaim-if-stale needed).

## Continuation, same bug class (LEADER item 2)

Continuing the same cron sweep past `sync-google-reviews` surfaced a worse
instance in `cron/tenant-health` (the "Fortress" live tenant-darkening
detector, every 15 min): `alertOwner()` fired on **every single run** where
any tenant failed its health check — zero dedup attempt at all, not even a
racy check-then-act window like every other monitor cron started from. A
single ongoing outage (a tenant's DNS/deploy broken for an hour) re-alerted
the platform owner via Telegram every 15 minutes for as long as it stayed
down, on top of the same duplicate-alert-under-concurrency race as the other
monitors.

**Fix:** a two-step atomic claim on a new `tenant_health_alerts(fingerprint)`
table — fresh insert first (fingerprint = sorted failing tenant slugs); on a
23505 conflict, a second atomic `UPDATE ... WHERE alerted_at < now()-1h`
reclaims and re-arms a stale row. Same "fresh claim, then reclaim-if-stale"
shape as `cron/health-monitor`'s `cron_health_alerts` — the failing-tenant
set is stable (the same tenant can go down, recover, and go down again days
later), so a plain permanent unique constraint would silently suppress every
future recurrence of that exact failure set forever. Deliberately a
**1-hour** re-alert window, shorter than health-monitor's 6h: a tenant's own
site being down is revenue-critical and customer-visible, not an internal
cron-liveness signal, so a tighter nag cadence is warranted. `ALERT_WINDOW_MS`
is a named constant in `route.ts` if Jeff/leader wants to retune it.

## Files (file-only, no push/deploy/DB)

- `src/app/api/cron/sync-google-reviews/route.ts` — collects new review ids,
  insert-first claim on `google_review_sync_alerts` before notifying.
- `src/lib/migrations/2026_07_18_google_review_sync_alerts_dedup.sql` — new
  table, not applied.
- `src/app/api/cron/sync-google-reviews/route.duplicate-notification-race.test.ts` —
  first-ever coverage of this route; 2 tests: (1) two concurrent invocations
  notify exactly once for the same new-review batch, (2) a second run with a
  genuinely different new review still notifies again (proves the fix
  dedupes by exact batch, not by tenant).
- `src/app/api/cron/tenant-health/route.ts` — two-step claim/reclaim on
  `tenant_health_alerts` before `alertOwner()`.
- `src/lib/migrations/2026_07_18_tenant_health_alerts_dedup.sql` — new table,
  not applied.
- `src/app/api/cron/tenant-health/route.duplicate-alert-race.test.ts` —
  first-ever coverage of this route; 3 tests: (1) two concurrent invocations
  alert exactly once, (2) a second run 45 min later (inside the 1h window)
  does NOT re-alert, (3) a run past the 1h window DOES re-alert and reclaims
  the SAME row (not a second row).

## Verification

- RED confirmed for both routes: `git diff <file> > patch && git apply -R`,
  re-ran each new test file against the pre-fix code. sync-google-reviews:
  a standalone throwaway assertion (not committed) proved the pre-fix route
  fires exactly 2 duplicate "feedback" notifications under two concurrent
  invocations for the identical new-review batch — the predicted failure.
  tenant-health: all 3 new tests failed for the predicted reasons — 2 calls
  to `alertOwner` on the concurrent race, 2 calls within the 1h window (no
  dedup at all pre-fix), and 0 rows in `tenant_health_alerts` (the table
  didn't exist in the pre-fix code path) on the reclaim test. Re-applied both
  patches — all 5 new tests GREEN.
- `tsc --noEmit --pretty false`: 0 new errors (same 5 pre-existing baseline
  errors as every pass this session — `admin-auth` route-types, 2 unrelated
  pre-existing test files, `sunnyside-clean-nyc` nav import — none touch
  these files).
- `eslint` on both routes + both new test files: 0 errors. The 3 warnings in
  `sync-google-reviews`'s new test file are unused mock-signature params
  (`_tenantId`, `_url`) — same pre-existing convention as
  `google-reviews.claim-before-reply-race.test.ts` (verified by running
  eslint against that file too: same warning shape, 0 errors either way).
- Full suite: `npx vitest run` — 628/628 files, 3350 passed + 1 pre-existing
  expected-fail, 0 regressions (net +2 files/+5 tests over this session's
  prior 626/3345 baseline).

File-only, no push/deploy/DB. Both new tables are pure additions (no
backfill needed — nothing to dedupe retroactively) and don't touch
`tenant_domains`; that schema lane (043/055/056/057/059/062/063/068/069/
2026_07_17_one_primary_per_tenant) remains unchanged this round.
