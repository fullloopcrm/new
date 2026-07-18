# Gap: cron/anthropic-health + cron/system-check had zero alert dedup

**Date:** 2026-07-18
**Worker:** W1 (schema + backfill lane, fresh-ground sweep)
**Files:** file-only — no push/deploy/DB executed

## Surface 1 (fresh-ground): cron/anthropic-health

`src/app/api/cron/anthropic-health/route.ts` pings the Anthropic API every 15
minutes (`vercel.json`). On a credit/auth/rate-limit failure it DMs the owner
via Telegram (`notifyOwnerOnTelegram`) — **unconditionally, every tick**, with
zero dedup attempt of any kind (not even a racy check-then-act SELECT, unlike
most of this session's other monitor bugs).

A real outage (e.g. Anthropic credits run out) silences Yinez across **every
tenant** until someone tops up console.anthropic.com. A 3-hour gap before
anyone notices means 12 near-identical "URGENT: Yinez OUT OF CREDITS" DMs.

Same bug class already closed for `cron/tenant-health`
(2026_07_18_tenant_health_alerts_dedup.sql) and `cron/health-monitor`
(2026_07_18_cron_health_alerts_dedup.sql) — this cron was simply unswept.

**Fix:** two-step atomic claim on new `anthropic_health_alerts(fingerprint,
alerted_at)` — fresh insert first (`fingerprint` = `'credit' | 'auth' |
'rate_limit'`, since these are qualitatively different problems that
legitimately recur independently); on a `23505` conflict, an
`UPDATE ... WHERE alerted_at < now()-1h` reclaims a stale row. 1h re-alert
window — same reasoning as `tenant-health`'s (not `health-monitor`'s 6h):
credit exhaustion is at least as revenue/customer-impact-critical as one
tenant's site being down, since it silences the AI agent across every tenant
at once.

Migration: `src/lib/migrations/2026_07_18_anthropic_health_alerts_dedup.sql`
(not run).

## Surface 2 (continuation, same class): cron/system-check

`src/app/api/cron/system-check/route.ts` runs hourly and calls `alertOwner()`
(Telegram) **unconditionally** on every run where any of its 10 checks fail —
same "zero dedup at all" class as surface 1. A single persistent condition
(an env var silently unset, DB connectivity degraded) re-alerts the owner
every hour for as long as it stays broken — a day-long outage is 24
near-identical "System Check FAILED" DMs.

**Notable side-finding, flagged not fixed:** this route also calls
`trackError(..., {severity:'high'})` immediately before its own `alertOwner()`
call. `trackError` (`src/lib/error-tracking.ts`) has its **own** internal
10-minute cooldown gating a second, differently-worded Telegram alert — but
that cooldown lives in a module-level `Map` (`alertCooldowns`), which is
**not durable across separate serverless invocations/cold starts** on
Vercel. It cannot reliably suppress anything in production; it just happens
to work within a single warm Lambda instance during local/test runs. This is
a separate, broader issue affecting **every** `trackError(severity:
high|critical)` call site across the app (dozens), not unique to
system-check — out of scope for a single-route dedup pass. Needs its own
DB-backed fingerprint-table pass across all `trackError` callers, likely
following the exact same `fingerprint` + `alerted_at` idiom used here.

**Fix:** two-step atomic claim on new `system_check_alerts(fingerprint,
alerted_at)` — fresh insert first (`fingerprint` = sorted failing check
names, e.g. `"Auth (Clerk),Environment"`); on a `23505` conflict, an
`UPDATE ... WHERE alerted_at < now()-6h` reclaims a stale row. 6h window —
same as `health-monitor`'s, since system-check's 10 dimensions are mostly
internal platform-ops signals (DB connectivity, env vars, notification
delivery rate, error rate), the same category as health-monitor's
cron-liveness signal, not a single tenant's customer-facing outage.

Migration: `src/lib/migrations/2026_07_18_system_check_alerts_dedup.sql`
(not run).

## Verification

- 7 new tests across 2 first-ever-covered routes:
  `src/app/api/cron/anthropic-health/route.duplicate-alert-race.test.ts` (4
  tests: single-alert-on-concurrent-invocations, no-re-alert-within-window,
  re-alert-after-window, immediate-re-alert-on-fingerprint-change) and
  `src/app/api/cron/system-check/route.duplicate-alert-race.test.ts` (3
  tests: same shape minus the fingerprint-change case).
- RED-confirmed: `git diff` of both route fixes saved to a patch, applied
  with `git apply -R`, reran the new tests against the pre-fix code — 6/7
  failed for the exact predicted reason (double-alert on concurrent
  invocations, or an unconditional second alert within the dedup window that
  should have been suppressed). Patch restored, all 7 GREEN again.
- `tsc --noEmit --pretty false`: same 5 pre-existing baseline errors only
  (`.next` generated admin-auth type, `cron/outreach` + `cron/payment-reminder`
  pre-existing test-signature errors, 2x `sunnyside-clean-nyc/_lib/site-nav.ts`
  from a different lane's untracked scaffolding) — none touch the files this
  round changed.
- `eslint` on all 4 touched/added files: 0 issues.
- Full suite run in progress at doc time; result to be appended to the
  LEADER-CHANNEL report.

## Not touched

- `tenant_domains` schema lane: reconfirmed intact, no drift this round.
- The `trackError` module-level cooldown durability gap (above) — flagged,
  not fixed. Needs its own pass.
