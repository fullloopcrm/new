# W4 broad-hunt — 2026-07-18 11:33 — public availability endpoints missing rate limit

## Fresh-ground surface

Continuation of the aging item opened at the 11:22 checkpoint: `GET /api/availability`
is public + fully unauthenticated (resolves `tenant` by slug or UUID from a query
param) and had **zero rate limit** — scriptable for tenant-slug enumeration (probe
slugs, see which resolve vs. 400) and for hammering the `checkAvailability()` DB
query at no cost to the caller.

## Method

Grepped every `export async function GET` under `src/app/api` for the absence of
any known auth/rate-limit marker (`rateLimitDb`, `requirePermission`, `requireAdmin`,
`getTenantForRequest`, portal-token patterns, etc.), then hand-verified each hit
individually — the naive grep produces false positives for routes that gate via a
differently-named helper (e.g. `protectClientAPI`, `getReferrerAuth`, `CRON_SECRET`
Bearer checks). Most hits were false positives; two were real.

## Findings fixed

1. **`GET /api/availability`** (`src/app/api/availability/route.ts`) — public,
   tenant param attacker-controlled, no rate limit at all. Fixed with
   `rateLimitDb('availability:${ip}', 30, 5 * 60 * 1000)`, keyed **per-IP not
   per-tenant** — a per-tenant key would let a caller rotate slugs to keep
   enumerating unthrottled, defeating the point of the fix.
2. **`GET /api/client/availability`** (`src/app/api/client/availability/route.ts`) —
   sibling of #1, same `checkAvailability()` call, tenant resolved from the host
   header instead of a param (so no cross-tenant enumeration angle) but still a
   fully public unauthenticated DB-querying GET with zero rate limit. Confirmed via
   `grep -rln "checkAvailability(" src/app/api` that these are the only two call
   sites — surface fully covered, no third sibling exists.

Both use the same 30-requests/5-minutes-per-IP cap as the existing
`smart-schedule` public-availability sibling (`src/app/api/client/smart-schedule/route.ts`),
so the convention stays consistent across the three public-availability-lookup routes.

## Investigated, not a gap

- `GET /api/referrers/[code]` returns referrer financial data (`total_earned`,
  `total_paid`, `commission_rate`) — looked concerning at first (no rate limit,
  looks reachable by guessing a code) but is actually gated by
  `getReferrerAuth(request)` (session-token check, a differently-named helper the
  naive grep missed), 401s with no data before any query runs. Not fixed, not a gap.
- `tenant/public`, `tenants/public`, `territories/options`, `service-types`,
  `tenant-sitemap` — all return only public marketing metadata (name/slug/logo/
  domain/service list), no PII or financial data. `tenant-sitemap` in particular
  is meant to be crawled by search engines — adding a rate limit there would risk
  breaking legitimate crawler traffic for no real security benefit. Left as-is.
- Every `cron/*` GET route without an explicit rate-limit marker in the grep was a
  false positive — all are gated by a `CRON_SECRET` Bearer-token check before any
  DB work runs.
- Every `team-portal/*` GET route without an explicit marker was a false positive —
  all gate via `Authorization: Bearer <team_token>` (a differently-named pattern
  the grep didn't match on).

## Verification

- RED/GREEN test-confirmed via `git diff <file> | git apply -R` per route (not the
  shared stash stack, which stays out of use per the 06:32 commitment): both new
  test files fail with `expected 200 to be 429` on the reverted code, pass after
  restoring the fix.
- 2 new test files, 4 new tests total:
  `src/app/api/availability/route.test.ts`,
  `src/app/api/client/availability/route.rate-limit.test.ts` (sibling-file
  convention — `client/availability/route.test.ts` already existed with 8
  pre-existing tests, left untouched).
- `npx tsc --noEmit`: 0 errors.
- Full suite: 726/728 files, 2538/2541 tests pass, 1 expected-fail, 1 skipped.
  2 files / 3 tests failing — both pre-existing and previously flagged, neither
  touched by this diff: `finance/cash-flow` partial-payment-double-count
  regression (unowned, repeatedly reproduced across many checkpoints this
  session) and `cron/tenant-health/status-coverage-divergence.test.ts`
  (intentional RED test from commit `edb7f600`). 0 regressions.

File-only. No push/deploy/DB.
