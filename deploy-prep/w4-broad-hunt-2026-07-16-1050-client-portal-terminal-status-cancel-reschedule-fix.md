# W4 broad-hunt — 2026-07-16 10:50 — adversarial pass (trade lifecycle continued)

## Order
10:43 LEADER->W4: Continue adversarial/break-things testing across trade
lifecycle. File-only, no push/deploy/DB.

## Scope this round
Followed the state-machine gap pattern from the 10:00 round (staff-side
`api/bookings/[id]/status` enforces a `VALID_TRANSITIONS` map that blocks
cancelling once a booking is `completed`/`paid`) out to the two
client-facing self-service surfaces that mutate the same `bookings` row and
checked whether they had an equivalent guard.

## Fixed

### 1. Client portal cancel had no booking-status guard (this round)
`PUT /api/portal/bookings/[id]` (customer-facing portal, JWT-authenticated)
let a client set `status: 'cancelled'` on their own booking regardless of
its current status — no check against `completed`/`paid`/`cancelled`/
`no_show`. The internal staff endpoint (`api/bookings/[id]/status`)
explicitly disallows this (`completed: ['paid']`, `paid: []` in its
`VALID_TRANSITIONS` map — no cancel path from either), but the portal route
duplicates the mutation logic independently and had no equivalent check.

Confirmed exploitable: a client could hit this route directly (bookmarked
link, replayed request, or just calling the API after the job was marked
paid) and flip an already-completed-and-paid booking to `cancelled`. This
route has no downstream accounting effect of its own — no refund is issued,
no payroll/cleaner-payout reversal happens, and it never calls the deal-sync
that the staff route runs (`deals.stage = 'lost'` on cancel) — so the result
is a silent, unaudited status flip that desyncs the booking from the money
that already moved and from the mirrored deal, with no audit log entry (the
staff route calls `audit()`; this route never did). Also fires a "Job
Cancelled" SMS to the team member and an admin email about a job that was
actually already finished and paid.

Fixed: added the same terminal-status guard used by the staff-side state
machine (`completed`, `paid`, `cancelled`, `no_show` → reject cancel with
400) before the update runs.

### 2. Client-facing reschedule had the same gap for start_time/end_time (this round)
`PUT /api/client/reschedule/[id]` let a client move `start_time`/`end_time`
on a booking regardless of status. The 10:15 round already reviewed this
route (for tenant-scope and rate-limit) and flagged the separate
start-before-end ordering gap as pre-existing/cosmetic, but didn't check
this specific angle. Payroll (`actual_hours`), closeout, and
cleaner-payout all key off a booking's timestamps once a job is
`completed`/`paid` — letting a client silently move those dates after
settlement would corrupt already-closed-out records with no error surfaced
anywhere. Fixed with the same terminal-status guard (`completed`, `paid`,
`cancelled`, `no_show` → reject with 400 when a time change is requested).

## Verification
- `npx tsc --noEmit --pretty false`: clean on both touched files; the same
  two pre-existing unrelated failures as every prior session
  (`bookings/broadcast/route.xss.test.ts` mock-typing,
  `sunnyside-clean-nyc/_lib/site-nav.ts` stale import) — untouched, present
  before this session.
- Both routes already had existing test suites (tenant-scope isolation,
  rate-limiting) — ran them first to confirm no regression (`21/21` passed
  after the fix, including the pre-existing suites), since neither fixture
  used a terminal status by default.
- Added two new regression test files:
  `client/reschedule/[id]/route.terminal-status.test.ts` (rejects a
  start_time change on `completed`/`paid`/`cancelled`/`no_show`, allows it
  on `scheduled`) and `portal/bookings/[id]/route.terminal-status.test.ts`
  (rejects cancel on the same four terminal statuses without ever calling
  the DB update, allows it on `scheduled`).
- File-only: no push, no deploy, no DB DDL — pure application-layer
  validation, no schema change needed.

## Commits this round
- (pending commit) fix(security): block client self-service cancel/
  reschedule on completed/paid bookings

Idle, awaiting next order.
