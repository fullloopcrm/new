# W4 broad-hunt — 2026-07-16 10:57 — adversarial pass (trade lifecycle continued)

## Order
10:53 LEADER->W4: Continue adversarial/break-things testing across trade
lifecycle. File-only, no push/deploy/DB.

## Scope this round
Re-checked the exact fix from the prior round (4b66f464, 10:47) for
completeness. That commit added a terminal-status guard to two sibling
routes: `PUT /api/portal/bookings/[id]` (cancel path only) and
`PUT /api/client/reschedule/[id]` (reschedule path). But `portal/bookings/[id]`
itself *also* handles reschedule (it accepts `start_time`/`end_time` in the
same PUT body, not just `status`) — that branch was never covered by either
half of the prior fix.

## Found + fixed

### `PUT /api/portal/bookings/[id]` reschedule branch had no terminal-status guard
The route's cancel branch got the `NON_CANCELLABLE_STATUSES` guard last round.
But the same route's `start_time`/`end_time` update path — a separate,
unrelated branch a few lines below — had zero equivalent check. A client
could still hit this endpoint with `{ start_time: ... }` (no `status` field
at all) and move an already-`completed`/`paid`/`cancelled`/`no_show`
booking's timestamps, exactly the corruption-of-settled-records risk the
prior fix's writeup called out for its sibling route
(`client/reschedule/[id]`) — just missed on this one because the prior
round's `start_time`/`end_time` guard was applied to the wrong route only.

Confirmed exploitable pre-fix: a client with a valid portal token could PUT
`{ start_time: <new time> }` against a `completed`/`paid` booking and it
would silently succeed (200, DB row updated, admin/team-member notifications
fired about a "reschedule" on a job that was already closed out) — same
payroll/`actual_hours`/cleaner-payout corruption risk as the already-fixed
sibling.

Fixed: added the identical `NON_CANCELLABLE_STATUSES`-gated check (400,
`Cannot reschedule a booking that is already <status>`) before the update
runs, guarding on `start_time || end_time` rather than `status === 'cancelled'`.

## Verification
- Mutation-tested: stashed only `route.ts` (kept the new test file), ran the
  8 new reschedule-guard tests — all 8 failed pre-fix (200 instead of 400,
  confirming the endpoint really did allow the mutation). Restored the fix,
  re-ran — all pass.
- Extended the existing `route.terminal-status.test.ts` (same file the prior
  round added for the cancel guard) with a second `describe` block: 4 cases
  rejecting `start_time` change across all 4 terminal statuses, 4 rejecting
  `end_time`-only change, 1 confirming reschedule still works on an open
  (`scheduled`) booking. 14/14 tests pass (6 pre-existing + 8 new).
- Caught and fixed a test-isolation bug in my own new assertions along the
  way: the file's `notifyMock` is module-level with no `vitest` `clearMocks`
  config, so an earlier describe block's `notify()` calls leaked into my new
  block's `not.toHaveBeenCalled()` assertions (4 false failures). Added a
  top-level `beforeEach(() => notifyMock.mockClear())` — not a product bug,
  a gap in the pre-existing test file's isolation that only surfaced once a
  second describe block using the same mock was added.
- `npx tsc --noEmit --pretty false`: clean on both touched files; same 2
  pre-existing unrelated failures every prior round has flagged
  (`bookings/broadcast/route.xss.test.ts` mock-typing,
  `sunnyside-clean-nyc/_lib/site-nav.ts` stale import) — untouched, present
  before this session, unrelated to bookings/portal code.
- Ran the full neighboring test surface (`portal/bookings`,
  `client/reschedule`, `bookings/[id]/status`): 32/32 pass, 9/9 files, zero
  regressions.
- File-only: no push, no deploy, no DB DDL — pure application-layer
  validation, no schema change needed.

## Not touched
Continued scanning `team-portal/jobs/claim`, `reassign`, `release`,
`jobs/[id]/payments`, `admin/bookings/[id]/cleaner-payout`,
`bookings/[id]/status`, `quotes/[id]/route.ts` (PATCH/DELETE),
`quotes/[id]/convert` + `convert-to-job`, `invoices/public/[token]/checkout`,
and `reviews/submit` this round — all already have correct tenant-scope,
atomic-claim, or terminal-state guards, or (for `reviews/submit`) already
carry a fixed URL-validation guard from an earlier round. No new gap found in
any of them.

## Commit
- (this round) fix(security): block client self-service reschedule via
  portal/bookings/[id] on completed/paid bookings

Idle, awaiting next order.
