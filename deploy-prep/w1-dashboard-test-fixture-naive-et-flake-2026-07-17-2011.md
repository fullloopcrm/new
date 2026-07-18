# W1 gap/fluidity — dashboard test-fixture naive-ET flake (2026-07-17 20:11 ET)

## What broke and why

Three dashboard aggregator test files seeded `bookings.start_time` via
`new Date().toISOString()` — a real UTC instant. `start_time`/`end_time` are
naive-ET wall-clock columns (established convention, see
`route.day-boundary.test.ts` and `lib/recurring.ts`'s `nowNaiveET()` header,
which fixed the equivalent bug in production `now`-cutoff logic earlier this
session). The dashboard route's today/week/month boundaries are correctly
built from ET wall-clock (`nowNaiveET()`), not server-local time.

Once UTC's calendar date rolls past ET's — roughly 8pm ET (EDT, UTC-4) —
`new Date().toISOString()` produces a date string that is *tomorrow* by ET
wall-clock. The route's (correct) naive-ET day-boundary logic then excludes
that seeded booking from "today," and the fixtures' hardcoded expectations
(revenue: 100, jobs: 1, etc.) come back as 0/undefined. This is a **test-fixture
bug only** — zero production risk, since production reads real timestamptz
data through the same correct naive-ET boundary logic the tests exercise.

This was found and flagged (not fixed) in W1's prior round at 20:05 ET,
specifically to avoid burning that round's authorized surface on an
out-of-lane test-fixture fix. Picked up fresh this round since it was still
live-reproducing at 20:07 ET (confirmed via direct `vitest run` before
touching anything — 7/12 tests failing with the exact predicted symptom:
`expected +0 to be 100`, `expected +0 to be 999999`, `expected +0 to be 1`,
plus one `Cannot read properties of undefined` cascade failure).

## Fix

`route.finance-redaction.test.ts`, `route.isolation.test.ts`,
`route.pin-redaction.test.ts`: replaced `new Date().toISOString()` /
the local `iso()` helper with `nowNaiveET()` (imported from `@/lib/recurring`,
the same helper `route.day-boundary.test.ts` already uses correctly) for every
`bookings.start_time` seed.

`route.isolation.test.ts` needed care: its `iso()` helper seeded **both**
`bookings.start_time` (naive-ET, needs `nowNaiveET()`) **and**
`clients.created_at` (genuine `timestamptz`, correctly stays on real UTC
`toISOString()` per `route.day-boundary.test.ts`'s own comment on that
distinction). Only the booking seeds were switched; `clients.created_at`
seeds were left untouched.

Verified RED pre-fix (captured above, live reproduction, not a hypothetical),
GREEN post-fix (4 files / 15 tests passing). tsc clean on touched files (4
pre-existing unrelated baseline errors elsewhere: stale `.next` admin-auth
generated types, two cron test files with unrelated arg-count issues, and
untracked `sunnyside-clean-nyc/_lib/site-nav.ts` from a different in-progress
work stream — none touched by this change). eslint 0 issues on touched files.
Full suite: 593/593 files, 3199 passed + 1 pre-existing expected-fail
(same one flagged by other workers all night), 0 regressions.

## Swept for the same pattern elsewhere — mostly false positives

Grepped the whole test suite for `start_time`/`end_time` seeded via
`new Date()`/`toISOString()`:

- `src/app/api/bookings/route.test.ts` — uses static far-future fixture
  dates (`2026-08-15T...`), never "now"-relative. Not affected.
- `src/app/api/team-portal/video-upload/route.{get-ownership,ownership}.test.ts`
  — seed `start_time: new Date().toISOString()`, but confirmed via
  `route.ts` that `start_time` there is only used for cosmetic job-date
  display (`new Date(booking.start_time).toLocaleDateString(...)`), never a
  day-boundary filter that flips a pass/fail assertion. Same surface
  pattern, different bug class — correctly left unchanged.

## Standing item

Restating the point from the prior round's flag: any worker's "full suite
green" claim during the ~7pm–midnight ET window carried a real risk of a
false alarm from this exact class (or, worse, a genuine regression getting
waved off as "the known flaky window"). That risk is now closed for these 3
files specifically. If a similar flake surfaces again during this window in
a file not covered by tonight's grep sweep, treat it as a live symptom worth
checking against the naive-ET convention before assuming it's environmental.

## tenant_domains schema lane (W1's owned surface) — reconfirmed intact

`043_tenant_domains.sql`, `055_tenant_domains_routing*.sql`,
`056_tenant_domains_routing_enforce.sql`, `068_tenant_domains_type_geo*.sql`,
`069_tenant_domains_type_geo_enforce.sql`, and
`2026_07_17_tenant_domains_one_primary_per_tenant.sql` all present, no drift,
no DB commands run this round (file-only, per standing rules).
