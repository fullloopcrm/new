# Gap: admin login brute-force lockout lived in a Map, not durable across cold starts

**Date:** 2026-07-18
**Worker:** W1 (schema + backfill lane, fresh-ground sweep)
**Files:** file-only — no push/deploy/DB executed

## Surface 1 (fresh-ground): POST /api/auth/login's `loginAttempts` Map

`src/app/api/auth/login/route.ts` is the legacy nycmaid PIN login — the live
`SiteAdminLoginClient.tsx` (its own comment: "shared so every site's login...")
is rendered on 4 tenant sites' `/login` pages (`nyc-mobile-salon`,
`wash-and-fold-hoboken`, `the-florida-maid`, `wash-and-fold-nyc`), all gated
by a single shared `ADMIN_PASSWORD` env var (one secret protects all four).
This is the same continuation of the durable-state sweep that found
`trackError()`'s cooldown and `referrers`' rate limiter last round: its
5-attempts/5-minute brute-force lockout lived in a module-level
`loginAttempts` Map, never migrated onto `rate-limit-db.ts` the way every
other auth-critical route already has (`admin-auth`, `client/login`,
`team-portal/auth`, `portal/auth`, `referrers/auth/*`, `pin-reset` — all call
`rateLimitDb(..., { failClosed: true })`). A module-level Map does not survive
a serverless cold start, and separate concurrent invocations on separate warm
instances each get their own independent counter — so an attacker guessing
the shared PIN sees a real 5-attempt lockout only within a single warm
process, not against horizontally-scaled production traffic. Worse than the
prior two findings in this class: this one directly guards authentication
(admin panel access), not just an internal alert or a public lookup endpoint.

**Fix:** swapped `loginAttempts` for `rateLimitDb('nycmaid_login:${ip}', 5,
5*60*1000, { failClosed: true })`, matching the exact convention every other
login-shaped route in the app already uses (failClosed since a rate-limit-DB
outage must deny, not silently drop brute-force protection). The
"reset the counter on a successful login" behavior the old Map had doesn't
translate to the count-based durable limiter — same simplification already
accepted by `admin-auth/route.ts` and every other `rateLimitDb`-backed login
route in this codebase (none of them distinguish success from failure in
their window count; a stateless sliding-window count over ALL attempts,
successful or not). The "3+ attempts" informational Telegram/email alert
(previously counted only consecutive failures) now derives from
`5 - rl.remaining` at the point of failure — same informational signal, same
translation tradeoff as the lockout threshold itself.

## Surface 2 (continuation, same bug class): swept for remaining instances — confirmed clean, one new dead-code sibling found

Grepped every remaining module-level `Map`/`Set` in the app
(`^const [a-zA-Z]* = new Map|Set`) for the same durability-critical shape:

- `api/team-applications/route.ts` (3 applications/10min) and
  `api/team-applications/upload/route.ts` (3 uploads/10min) and
  `api/client/smart-schedule/route.ts` (30 req/5min) all use the same
  in-memory pattern, but all three are spam-defense on non-auth-critical
  endpoints (team application intake, a public scheduling-suggestion
  lookup) — the same acceptable-tradeoff class as `track/route.ts`,
  confirmed correctly-not-a-bug last round. `team-applications/route.ts`
  even carries its own explicit comment saying so ("Acceptable here since
  it's a spam defense layer, not a security boundary."). Left untouched.
- Every other Map found (`settingsCache`, `configCache`, `slugCache`,
  `domainCache`, `cachedTokens` in `lib/seo/gsc.ts`) is a legitimate
  TTL cache, not state a correctness/security guarantee depends on being
  durable. Not this bug class.

This closes the durable-state sweep this session started — no live
in-memory-Map-standing-in-for-a-durability-guarantee instances remain
unfixed anywhere in the app.

Side-finding while investigating `auth/login`'s downstream session
verification (`src/lib/nycmaid/auth.ts` — already well-hardened: HMAC-signed
sessions, `timingSafeEqual`, fails closed when `ADMIN_PASSWORD` is unset):
grepped for anything importing each of the 4 tenant sites'
`_lib/auth.ts` (own copies of admin-session/login helpers, found via the
earlier `admin_users` table-reference grep) and found **zero** live
references anywhere in the repo, on all 4
(`nyc-mobile-salon`/`wash-and-fold-hoboken`/`the-nyc-interior-designer`/`wash-and-fold-nyc`).
Same shape as the already-flagged `_lib/error-tracking.ts` dead files from
last round's doc — a second dead-code family sitting alongside the first,
same 4 site directories. Confirmed these do NOT duplicate the Map-based
rate-limit bug (no `rateLimit`/`new Map` in any of them, grepped) — they're
pure session helpers, unused. Not fixed here since there's nothing live to
protect; flagging alongside the existing `_lib/error-tracking.ts` finding in
case a future cleanup pass wants to delete both families outright.

## Verification

- 4 new tests in `src/app/api/auth/login/route.rate-limit-durability.test.ts`
  (5-then-429, lockout survives even when the 6th attempt would have been
  correct, independent-IP budgets, dedicated bucket key not shared with any
  other route). RED-confirmed: `git diff` of the fix saved to a patch,
  reverted with `git apply -R`, reran the new suite against the pre-fix
  code — 1/4 failed for the exact predicted reason (the bucket-key-wiring
  assertion; old code never calls `rateLimitDb` at all so the mock's
  tracking map stays empty). The other 3 assertions hold under the old
  single-process Map too — same discrimination limit documented for the
  `referrers` fix last round: a same-thresholds storage-backend swap can't
  be told apart from the original by a single warm test process for
  scenarios both implementations happen to get right in isolation. Patch
  restored, all 4 GREEN again.
- Updated `route.test.ts` and `route.xss.test.ts` (both now mock
  `@/lib/rate-limit-db`, required since the route imports it) — all 6
  existing tests still pass.
- `tsc --noEmit --pretty false`: same 5 pre-existing baseline errors only
  (`.next` generated admin-auth type, `cron/outreach` +
  `cron/payment-reminder` pre-existing test-signature errors, 2x
  `sunnyside-clean-nyc/_lib/site-nav.ts` from a different lane's untracked
  scaffolding) — none touch the files this round changed.
- `eslint` on all touched/added TS files: 0 errors (1 pre-existing
  unused-var warning in `route.xss.test.ts`, unrelated to this round).
- Full repo test suite: 640 files / 3390 tests passing + 1 expected fail
  (was 639/3387+1) — net +1 file/+4 tests, 0 regressions.

## Not touched

- `tenant_domains` schema lane: reconfirmed intact, no drift this round.
