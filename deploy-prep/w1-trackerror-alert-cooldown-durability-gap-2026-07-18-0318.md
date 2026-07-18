# Gap: trackError()'s Telegram-alert cooldown lived in a Map, not the DB

**Date:** 2026-07-18
**Worker:** W1 (schema + backfill lane, fresh-ground sweep)
**Files:** file-only — no push/deploy/DB executed

## Surface (fresh-ground, continuation of a flagged side-finding)

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

- 6 new tests in
  `src/lib/error-tracking.duplicate-alert-race.test.ts`: single-alert-on-
  concurrent-calls, no-re-alert-within-window, re-alert-after-window,
  immediate-re-alert-on-fingerprint-change, no-alert-and-no-cooldown-row-for
  medium/low severity, error_logs/notifications still written even when the
  Telegram alert itself is suppressed.
- RED-confirmed: `git diff` of the fix saved to a patch, applied with
  `git apply -R`, reran the new tests against the pre-fix code — 5/6 failed
  (the medium/low-severity test passed trivially either way, since it never
  touches the cooldown path). Patch restored, all 6 GREEN again.
- Ran the full existing test suites for every call site touched by this
  change (`api/contact`, `api/portal/collect`, `api/ingest/lead`, `api/lead`,
  `api/errors`, `cron/system-check`, `cron/lifecycle`, `cron/health-check`,
  `cron/late-check-in`, `cron/anthropic-health`, `cron/comms-monitor`,
  `cron/health-monitor`) — 48 tests, all passing, no regressions from
  centralizing the dedup change in the shared helper.
- `tsc --noEmit --pretty false`: same 5 pre-existing baseline errors only
  (`.next` generated admin-auth type, `cron/outreach` +
  `cron/payment-reminder` pre-existing test-signature errors, 2x
  `sunnyside-clean-nyc/_lib/site-nav.ts` from a different lane's untracked
  scaffolding) — none touch the files this round changed.
- `eslint` on both touched/added TS files: 0 issues.
- Full repo test suite kicked off in background; not yet returned at doc
  time — result to be appended to the LEADER-CHANNEL report if it surfaces
  anything.

## Not touched

- `tenant_domains` schema lane: reconfirmed intact, no drift this round.
