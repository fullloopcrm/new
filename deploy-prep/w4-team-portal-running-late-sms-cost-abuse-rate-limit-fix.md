# team-portal/running-late unmetered SMS trigger — rate-limit fix — W4, 2026-07-15

## Finding

Continuing the broad-hunt (20:51 leader order, lower-risk surface, file-only).
Searched for endpoints that send SMS/email with no rate limiting at all, by
diffing every route that calls `sendSMS`/`sendEmail`/Twilio against every
route that calls `rateLimitDb`/`rateLimit`. Most of the ~45 unrated hits are
cron jobs (server-triggered, not attacker-reachable), admin-gated internal
tools, or self-serve client flows that are naturally idempotent (e.g.
`client/confirm/[token]` only fires its SMS once — a repeat call short-circuits
on `client_terms_accepted_at` already being set).

One real gap: `POST /api/team-portal/running-late`. Gated by
`requirePortalPermission(request, 'jobs.view_own')` — a team member, the
lowest-trust authenticated tier in this app (per prior W4 findings on this
same portal tier) — but with **no rate limit and no idempotency check**. Every
call:
- SMS's the client's real phone number (`smsRunningLateClient`)
- SMS's the tenant admin's phone number (`smsRunningLateAdmin`)
- sends push notifications to both

A team member with a valid portal token for their own booking could loop this
endpoint indefinitely, running up real Telnyx SMS costs and — more
concerning — repeatedly texting a client's phone (harassment vector), with
zero cap. This is the same "unmetered cost-abuse by an authenticated but
lower-trust actor" bug class fixed on the AI-endpoint sweep earlier this
session (`w4-ai-endpoint-cost-abuse-rate-limit-fix.md`), just SMS instead of
Anthropic spend, and a lower-trust caller (team member vs. any tenant member).

## Fix

Added `rateLimitDb(\`running-late:${auth.id}\`, 5, 10 * 60 * 1000)` right
after auth resolves, before any DB read/write or SMS send — 5 reports per
team member per 10-minute window, matching the `rateLimitDb(bucketKey, max,
windowMs)` convention used on every other sibling fix this session. Returns
429 with no side effects when exceeded.

## Verification

- `npx tsc --noEmit` — clean.
- Extended the existing `route.tenantdb.test.ts` with a mock for
  `@/lib/rate-limit-db` (`allowed: true` default) plus a new test that forces
  `allowed: false` via `mockResolvedValueOnce` and asserts: 429 returned, and
  the booking row's `running_late_eta` is untouched (proving the rate-limit
  check runs before any mutation, not just before the SMS send). Both tests
  in the file pass (2/2).
- Full suite: 354/355 files, 1483/1486 tests pass (1 pre-existing expected
  fail on `cron/tenant-health/status-coverage-divergence.test.ts`, unrelated
  to this change — same baseline noted in prior W4 reports this session), 0
  regressions.
- File-only change, no push/deploy/DB. Commit `154132f0`.

## Also checked this pass, clean / lower-value (no changes)

- `client/confirm/[token]` POST: naturally idempotent (early-returns
  `alreadyAccepted` once terms are accepted), so repeat calls with a valid
  token can't re-trigger the SMS send — no fix needed.
- `client/reschedule/[id]` PUT: gated by `protectClientAPI` (an authenticated
  client acting on their own booking); repeated reschedules are
  self-directed (the caller can only spam themselves/their own tenant's
  admin), a materially smaller blast radius than the team-portal finding and
  consistent with how the reschedule UI is meant to be used — left as-is.
- `finance/statements` DELETE: found the route derives a storage-remove path
  from a client-suppliable `file_url` set at POST time with no validation,
  and the bucket name it targets (`'finance'`) doesn't even match the bucket
  the real upload route writes to (`'uploads'`, per
  `finance/upload/route.ts`). No frontend anywhere references this API route
  (`bank_statements`/`bank-statements` grep across `src/app` returns nothing
  outside the route file itself) — orphaned/dead code, not a live reachable
  bug. Left unfixed: patching unreachable dead code is out of scope for a
  security pass and would be guessing at intended behavior for a feature
  that was never wired up.
- New SEO-manager surface (`src/lib/seo/*`, `cron/seo-health`,
  `cron/seo-improve`, `admin/seo/apply`): all admin-gated
  (`requireAdmin()`/guarded `CRON_SECRET` bearer), no tenant-dashboard-facing
  routes exist for it (`seo_issues`/`seo_changes`/`seo_overrides` don't
  appear anywhere under `src/app/api/dashboard` or `src/app/dashboard`), and
  the one real historical SSRF risk (fetching a tenant-controlled domain in
  `checkFleetHealth`) is already guarded via `safeFetch()` with an inline
  comment documenting the fix. No new gap found.
- CRON_SECRET compare convention (`!process.env.CRON_SECRET || bearer !==
  ...`) — confirmed `seo-health`/`seo-improve` (new cron routes) already
  follow the fail-closed guard fixed fleet-wide in
  `w4-cron-secret-fail-open-on-unset-fix.md`; not a new site.
- Storage upload routes (`admin/notes/upload`, `booking-notes/upload`,
  `cleaners/upload`, `finance/upload`, `public-upload`, `reviews/upload`,
  `team-applications/upload`, `uploads`): all derive the storage key from a
  server-generated tenant/timestamp/random path and only take the file
  extension from the client-supplied filename — no path-traversal surface.
- Content-Disposition headers built from user/derived filenames
  (`clients/[id]/export`, `admin/businesses/[id]/site-export`): both already
  sanitize to `[a-z0-9.-]`/strip control chars before interpolating —
  no header-injection surface.
