# Gap: two more places durable state was only in-memory, not the DB

**Date:** 2026-07-18
**Worker:** W1 (schema + backfill lane, fresh-ground sweep)
**Files:** file-only — no push/deploy/DB executed

## Surface 1 (fresh-ground, continuation of a flagged side-finding): trackError()'s Telegram-alert cooldown

`src/lib/error-tracking.ts`'s `trackError()` is the shared helper behind
~10 call sites across the app (`cron/system-check`, `cron/comms-monitor`,
`cron/health-check`, `cron/health-monitor`, `cron/late-check-in`,
`cron/schedule-monitor`, `api/contact`, `api/portal/collect`,
`api/ingest/lead`, `api/lead`) — any of them calling it with
`severity:'high'|'critical'` triggers a real Telegram DM via `alertOwner()`.

Its own cooldown gating that DM lived in a module-level `alertCooldowns`
Map, keyed by `${source}:${message.slice(0,50)}` with a 10-minute window.
This was flagged as a side-finding in this session's
`2026_07_18_system_check_alerts_dedup.sql` / `..._anthropic_health_..._sql`
docs but explicitly left out of scope for that single-route pass. Picking
it up now: a module-level Map is **not durable across separate serverless
invocations** on Vercel — every cold start (and any instance recycle) begins
with an empty Map, so in production this cooldown could not reliably
suppress anything. It only appeared to work in local/test runs because a
single warm process keeps reusing the same Map. A persistent high/critical
condition hitting any of those ~10 call sites could re-DM the owner on every
single invocation for as long as it lasts, with no actual rate limiting in
production despite the code visibly trying to rate-limit.

(`api/errors/route.ts` already has its own separate, unrelated per-IP
mitigation for this exact risk — added earlier for its public/unauthenticated
attack surface specifically — so it wasn't itself broken, but it still routes
through the same non-durable `trackError` cooldown underneath.)

**Fix:** two-step atomic claim on new `error_alert_cooldowns(fingerprint,
alerted_at)` — fresh insert first (`fingerprint` = the same
`${source}:${message.slice(0,50)}` key the Map used); on a `23505` conflict,
an `UPDATE ... WHERE alerted_at < now()-10m` reclaims a stale row. Same
10-minute window as before — this preserves existing alert cadence, it only
makes the suppression actually durable. Same idiom as every other
alert-dedup fix this session (`system_check_alerts`, `anthropic_health_alerts`,
`cron_health_alerts`, `tenant_health_alerts`).

Migration: `src/lib/migrations/2026_07_18_error_alert_cooldowns_durable.sql`
(not run). Code fix lands in the same commit, centralized in
`trackError()` itself — this closes the gap for all ~10 call sites at once,
not just the two crons that first surfaced it.

## Surface 2 (continuation, same bug class): referrers GET/POST rate limit

Grepped the rest of the codebase for the same class — a local `new Map`
standing in for something that's supposed to survive across serverless
instances — and found `src/app/api/referrers/route.ts` still had its own
hand-rolled `attempts` Map + `checkRateLimit()`, gating both the public
referral-code/email lookup (`GET`, 10 req/10min/IP) and the referrer signup
(`POST`, 5 req/10min/IP). The rest of the app already migrated onto
`src/lib/rate-limit-db.ts` (its own doc comment literally says "Survives
serverless cold starts (unlike the in-memory Map in rate-limit.ts)") — this
route was simply missed when that migration happened. The standalone
`src/lib/rate-limit.ts` module itself is confirmed dead code (only its own
test imports it) — not the bug here, just evidence the in-memory-limiter
pattern was already known to be wrong and abandoned everywhere else.

Impact: the GET lookup with no durable limiter makes referral-code
enumeration (guess a code, read back name/email — see the existing
`route.test.ts` financial-leak regression suite for why that lookup exists
and what it must never expose) and email-registration probing meaningfully
cheaper against horizontally-scaled production traffic than the code's
visible "10 per 10 minutes" intent suggests; POST's signup limiter has the
same gap for spam signups.

Checked `track/route.ts`'s similar-looking in-memory Map too (same grep
turned it up) — that one is NOT a bug: its own comment already documents the
cold-start tradeoff as deliberate/acceptable, and it's already layered under
a `rateLimitDb` per-tenant ceiling as the real backstop. Left untouched.

**Fix:** swapped `attempts`/`checkRateLimit` for `rateLimitDb`, same bucket
keys and thresholds (`referrer-lookup:${ip}`/10 per 10min,
`referrer-signup:${ip}`/5 per 10min), fail-open (default) since neither
branch is auth-critical the way login/OTP/PIN is.

**Testing note (flagged, not a gap in the fix):** unlike surface 1's "zero
dedup at all" bug, this is a same-thresholds swap of the *storage backend*
of an already-correct rate limit — a plain RED/GREEN unit test can't
discriminate old vs. new within a single warm test process, since both
implementations enforce the identical count/window there. Confirmed this by
actually reverting the route fix and rerunning the new
`route.rate-limit-durability.test.ts` suite — all 4 tests still passed
against the pre-fix code, for exactly this reason (documented in the test
file too, not hidden). The real property under test — that the counter now
lives in a table `rateLimitDb` itself documents as surviving cold starts,
instead of a Map that provably doesn't — isn't something a single-process
unit test can observe directly; it's a property of the two implementations,
verified by reading both, not by a passing/failing assertion.

## Not touched (side-finding, flagged not fixed)

Four unrelated per-tenant legacy files each define their own local, unused
copy of the identical `trackError()` + in-memory `alertCooldowns` Map bug:
`src/app/site/{nyc-mobile-salon,wash-and-fold-hoboken,the-nyc-interior-designer,wash-and-fold-nyc}/_lib/error-tracking.ts`.
Confirmed dead code — grepped for any import of `./error-tracking` under
each site's tree and found none; nothing calls these functions. Not fixed
here since there's nothing live to fix; flagging in case a future cleanup
pass wants to delete them outright instead.

Also reconfirmed the multi-branch SEO-manager cron surface
(`seo-autopilot`, `seo-competitors`, `seo-enrich`, `seo-propose`,
`seo-verify-revert`, plus uncommitted `seo-health`/`seo-improve` +
`lib/seo/*` in this worktree) is **not** fresh ground — it's the same
known cross-branch divergence already tracked in
`platform/deploy-prep/w1-vercel-json-seo-alerts-reconcile-2026-07-16.md`
(6 branches with different subsets of this feature, awaiting a
pick-one-branch decision, not a merge). Left untouched; auditing or fixing
race conditions in code slated for reconciliation would be wasted effort
until that decision lands.

## Verification

- Surface 1: 6 new tests in
  `src/lib/error-tracking.duplicate-alert-race.test.ts`: single-alert-on-
  concurrent-calls, no-re-alert-within-window, re-alert-after-window,
  immediate-re-alert-on-fingerprint-change, no-alert-and-no-cooldown-row-for
  medium/low severity, error_logs/notifications still written even when the
  Telegram alert itself is suppressed. RED-confirmed: `git diff` of the fix
  saved to a patch, applied with `git apply -R`, reran the new tests against
  the pre-fix code — 5/6 failed (the medium/low-severity test passed
  trivially either way, since it never touches the cooldown path). Patch
  restored, all 6 GREEN again.
- Surface 2: 4 new tests in
  `src/app/api/referrers/route.rate-limit-durability.test.ts` (10-then-429
  on GET, independent-IP budgets, 5-then-429 on POST, GET/POST buckets don't
  share a budget) + updated the existing `route.test.ts` to mock
  `rate-limit-db` (required — the route now imports it). RED-revert result
  documented above: doesn't discriminate old vs. new for this swap, by
  design of what changed.
- Ran the full existing test suites for every call site touched by either
  change (`api/contact`, `api/portal/collect`, `api/ingest/lead`, `api/lead`,
  `api/errors`, `api/referrers`, `cron/system-check`, `cron/lifecycle`,
  `cron/health-check`, `cron/late-check-in`, `cron/anthropic-health`,
  `cron/comms-monitor`, `cron/health-monitor`) — all passing, no
  regressions from either change.
- `tsc --noEmit --pretty false`: same 5 pre-existing baseline errors only
  (`.next` generated admin-auth type, `cron/outreach` +
  `cron/payment-reminder` pre-existing test-signature errors, 2x
  `sunnyside-clean-nyc/_lib/site-nav.ts` from a different lane's untracked
  scaffolding) — none touch the files this round changed.
- `eslint` on all touched/added TS files: 0 errors (3 pre-existing unused-var
  warnings unrelated to this round's edits).
- Full repo test suite, twice (once after each fix): 639 files / 3387 tests,
  all passing (1 expected fail, pre-existing).

## Not touched

- `tenant_domains` schema lane: reconfirmed intact, no drift this round.
