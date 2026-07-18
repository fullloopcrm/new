# cron/comms-monitor + cron/health-monitor had no dedup constraint behind their fingerprint-check dedup (2026-07-18 01:46)

## Fresh-ground discovery (LEADER item 1)

`GET /api/cron/comms-monitor` (src/app/api/cron/comms-monitor/route.ts) is a
15-min platform-wide monitor: scan `notifications` for `comms_fail` rows in
the last 20 min, and if any exist, DM the platform admin via `alertOwner()`
(real Telegram send) + insert a `comms_monitor_alert` audit row. Dedup was a
plain check-then-act: SELECT `notifications` for an existing
`comms_monitor_alert` whose message contains the current run's `fingerprint`
(a sorted join of the failing notification ids) within the last hour, THEN
alert + insert unconditionally if none found — no DB constraint backed the
check. This route has no `maxDuration` override; two overlapping invocations
(a slow round-trip bleeding into the next 15-min tick, a manual re-trigger)
can both read zero prior alerts for the same fingerprint and both DM the
admin, doubling a real incident alert. Same check-then-act class this session
has repeatedly found and fixed (cron/schedule-monitor, cron/sales-follow-ups,
every webhook redelivery-dedup pass) — this route and its sibling below were
never swept for it.

**Fix:** insert-first claim on a new `comms_monitor_alerts(fingerprint)`
table before `alertOwner()`/notify-insert — a 23505 unique violation means
another invocation already claimed this fingerprint, so the loser skips as
an idempotent no-op, same idiom as `telnyx_webhook_events` /
`resend_webhook_events` / `stripe_webhook_events`. A **plain permanent**
unique constraint is correct here (not just a stopgap): `fingerprint` is
built from notification ids that themselves age out of the 20-min lookback
window before an hour passes, so the exact same fingerprint reappearing
after it's no longer in `fails` is structurally unreachable — the old
1-hour dedup horizon was already moot.

## Continuation, same surface (LEADER item 2)

Grepping for the same `fingerprint` + `message.includes(\`fingerprint=...\`)`
shape surfaced an identical bug in `GET /api/cron/health-monitor` — a
platform-wide "is every cron still alive" watchdog, dedup'd the same way
(SELECT `notifications` for a `cron_health_alert` row matching the current
failing-cron-set fingerprint in the last 6h, then alert + insert
unconditionally). Same race, same fix shape — **except** the fingerprint
here (`failures.map(f => f.cron).sort().join(',')`) is a **stable cron-name
set**, not ephemeral ids: the same set of crons can legitimately go silent,
recover, and go silent again days later, so the 6-hour re-alert window is
real, load-bearing behavior — a plain permanent unique constraint (comms-
monitor's fix) would have silently suppressed every future recurrence of
that failing set forever, a worse bug than the one being fixed.

**Fix:** a two-step atomic claim on a new `cron_health_alerts(fingerprint)`
table — fresh insert first; on a 23505 conflict, a second atomic
`UPDATE ... WHERE alerted_at < now()-6h` reclaims and re-arms a stale row.
Same "fresh claim, then reclaim-if-stale" two-step compare-and-swap this
session already used for `create-tenant-from-lead.ts`'s conversion claim,
just against a dedicated fingerprint row instead of a nullable column on an
existing entity.

Both `notifications` inserts (`comms_monitor_alert` / `cron_health_alert`)
are kept as-is for admin-visible audit trail — they're no longer the dedup
mechanism, just the log.

## Files (file-only, no push/deploy/DB)

- `src/app/api/cron/comms-monitor/route.ts` — insert-first claim on
  `comms_monitor_alerts`.
- `src/lib/migrations/2026_07_18_comms_monitor_alerts_dedup.sql` — new table,
  not applied.
- `src/app/api/cron/comms-monitor/route.duplicate-alert-race.test.ts` —
  first-ever coverage of this route; 1 test, two concurrent invocations,
  asserts `alertOwner` called exactly once.
- `src/app/api/cron/health-monitor/route.ts` — two-step claim/reclaim on
  `cron_health_alerts`.
- `src/lib/migrations/2026_07_18_cron_health_alerts_dedup.sql` — new table,
  not applied.
- `src/app/api/cron/health-monitor/route.duplicate-alert-race.test.ts` —
  first-ever coverage of this route; 3 tests: (1) two concurrent invocations
  alert exactly once, (2) a second run 2h later (inside the 6h window) does
  NOT re-alert, (3) a run past the 6h window DOES re-alert and reclaims the
  SAME row (not a second row) — the case that would silently break under a
  naive permanent-unique-constraint copy of comms-monitor's fix.

## Verification

- RED confirmed for both routes: `git diff <file> > patch && git apply -R`,
  re-ran each new test file against the pre-fix code — comms-monitor's test
  failed for the predicted double-alert (`alertOwner` called 2x, expected
  1x); all 3 health-monitor tests failed for the predicted reasons (double
  alert on the race; the 6h-reclaim test failed differently, proving the old
  code's window check was itself exercised correctly by the test before the
  fix, and the "reclaimed same row" assertion failed with 0 rows since the
  old code never wrote a `cron_health_alerts` row at all). Re-applied both
  patches — all 4 new tests GREEN.
- `tsc --noEmit --pretty false`: 0 new errors (same 5 pre-existing baseline
  errors as every pass this session — `admin-auth` route-types, 2 unrelated
  pre-existing test files, `sunnyside-clean-nyc` nav import — none touch
  these files). Self-caught during authoring: my first test draft for
  comms-monitor typed the `alertOwner` mock wrapper with named params,
  which broke under this repo's spread-arg convention for mocked externals
  (`(...args: unknown[]) => real(...args)`) — matched the existing
  `sendTelegram`/`askSelena` mock pattern instead (untyped `vi.fn()` +
  `unknown[]` spread wrapper) rather than fighting the type system.
- `eslint` on all 4 touched/new files: 0 errors, 0 warnings.
- Full suite: `npx vitest run` — 626/626 files, 3345 passed + 1 pre-existing
  expected-fail, 0 regressions (net +4 tests over this session's prior
  622/3341 baseline).

File-only, no push/deploy/DB. Both new tables are pure additions (no
backfill needed — nothing to dedupe retroactively) and don't touch
`tenant_domains`; that schema lane (043/055/056/057/059/062/063/068/069/
2026_07_17_one_primary_per_tenant) remains unchanged this round.
