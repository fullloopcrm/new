# Client-facing reschedule/cancel SMS+email cost-abuse rate-limit fix — W4, 2026-07-15

Continuation of the broad-hunt sweep (21:02 order), lower-risk surface. Same
bug class as the already-fixed `team-portal/running-late` (`4ff175f5`) and
`leads/visits`/`translate`/`request-automation` cost-abuse fixes: a
low-trust, authenticated-but-not-privileged actor can trigger real
paid-SMS/email sends by looping an endpoint with no other cap.

## Fixed

- **`PUT /api/portal/bookings/[id]`** (tenant-agnostic client portal,
  `verifyPortalToken`-gated): reschedule/cancel fires an SMS to the assigned
  team member (`notify(..., channel:'sms', recipientType:'team_member')`)
  plus an admin email (`notify(..., channel:'email', recipientType:'admin')`)
  on every call that changes `start_time`/`status`. No rate limit existed —
  a client with a valid (legitimately issued) portal token could loop the
  endpoint to spam a real team member's phone and the admin inbox.
- **`PUT /api/client/reschedule/[id]`** (`protectClientAPI`-gated client
  session, used by the nycmaid/tenant-site client variant): fires a client
  SMS (Telnyx, real $ cost), an admin `notify()`, and a team-member SMS
  (`notifyTeamMember`) on every call — three notification channels, also
  with zero rate limiting. Same exposure, larger blast radius per call than
  the portal-token route above.

Both gated with `rateLimitDb(`<bucket>:${clientId}`, 10, 10 * 60 * 1000)` —
matching the `running-late` convention (auth-scoped bucket key, fail-open on
DB outage since this isn't an auth-critical path), placed immediately after
the auth check and before any DB reads/writes so a throttled caller can't
even read another client's booking data via the 404-vs-200 timing/shape.
10 req/10min chosen to allow a few legitimate self-service reschedules in a
session while blocking a tight loop.

## Checked, not fixed (weaker/no exploit path)

- **`POST /api/client/confirm/[token]`**: sends client SMS + admin SMS +
  notify() only on the *first* successful terms-acceptance — a repeat call
  after acceptance short-circuits via `if (booking.client_terms_accepted_at)
  return already accepted` before any send. Real abuse would require racing
  two concurrent requests before the first `update()` commits (a
  duplicate-send race, not an unbounded loop) — a materially smaller/harder
  exploit than the two fixed routes. Flagging here, not fixing unilaterally
  in this pass to keep the diff scoped to the clear-cut loop-abuse bugs.
- **`POST /api/portal/bookings`** (create) and **`POST /api/portal/messages`**
  / **`POST /api/portal/feedback`**: plain DB inserts, no `notify()`/SMS
  dispatch in the request path — spam would only produce extra rows, not
  paid-channel sends.

## Verification

`npx tsc --noEmit` clean. Extended the 3 existing `client/reschedule/[id]`
test files (`tenantdb`, `team-member-scope`, `email-logs-tenant-stamp`) and
1 existing `portal/bookings/[id]` test file with a
`vi.mock('@/lib/rate-limit-db', ...)` stub (both routes' rate limiter reuses
`supabaseAdmin` under the hood, which those tests already mock with a
generic chain lacking `.gte()` — confirmed each broke with `TypeError:
...eq(...).gte is not a function` before the mock was added, now passes).
Added `route.rate-limit.test.ts` for `portal/bookings/[id]` (429 blocks the
notify path; a normal request still succeeds) mirroring the existing
`settings/request-automation/route.rate-limit.test.ts` pattern. 11 tests
across the 6 touched/added files pass, 0 regressions. File-only, no
push/deploy/DB.
