# W4 — Item 2 of 17:39 LEADER order: archetype depth — team-portal checkout double-checkout race

Time: 17:39 order, landed ~17:52. File-only, no push/deploy/DB.

## `POST /api/team-portal/checkout` double-checkout race

The 11:01 order already added a `status !== 'in_progress'` guard to this
route to stop a cancelled/no-show booking from being force-completed. That
guard reads a plain `SELECT` snapshot, same as `check_out_time`, and the
actual `bookings` UPDATE that flips the booking to `'completed'` was still
**unconditional** — no `WHERE status='in_progress'`. A field cleaner
double-tapping "Check Out" on a spotty connection, or a client-side retry
after a timeout (both routine in the field-service archetype this route
serves — hourly cleaning/maid checkout is the highest-volume mutation path
in the whole app), fires two near-simultaneous requests that both read
`'in_progress'`/`check_out_time: null` before either write lands and both
fall through:

- Both compute `actual_hours`/`team_member_pay`/`price` independently (each
  call's own `checkOutTime = new Date()`, so the two computations can differ
  slightly) and both write it — a lost update where whichever call's row
  lands last silently wins, not necessarily the true first checkout.
- Both push a `"Cleaning complete!"` notification to the client
  (`sendPushToClient`).
- Both can fire the NYC Maid `"UNPAID CHECKOUT"` SMS alert to admins if
  payment wasn't reported.
- Both can append a duplicate GPS-mismatch note to the booking's `notes`.

Two things were **already** safe and did not need fixing, verified by
reading `lib/payment-processor.ts`: the Stripe Connect payout/mark-paid path
(`processPayment`, gated behind NYC Maid + a reported payment method) is
keyed on a deterministic `reference_id` (`cleaner-checkout-${booking.id}`)
with a `UNIQUE` constraint that makes a concurrent duplicate call a clean
23505 no-op (confirmed via the existing `[payment-processor] duplicate ...
delivery ignored` handling), and the referral-commission insert is already
idempotent via `UNIQUE(booking_id)`. So the live financial-double-payment
risk was already closed; this fix closes the remaining duplicate-notify +
lost-update risk.

Fix: claim the `in_progress -> completed` transition atomically
(`eq('status','in_progress')` + `eq('tenant_id', auth.tid)` in the UPDATE's
WHERE, `.select().maybeSingle()`) — only the request that actually flips the
row proceeds to notify; the loser gets a clean 409 instead of a duplicate
"Cleaning complete!" push and a possible lost-update on the billed hours/pay.

## Verification

- New test `checkout/route.double-checkout-race.test.ts`, 3 tests: normal
  checkout flips status + pushes the one client notification once; a
  fully-sequential second checkout is caught by the pre-existing `status`
  snapshot check (400, confirms no regression to that path — it never even
  reaches the new claim); `Promise.all([POST, POST])` concurrent race yields
  exactly one 200 + one 409, exactly one `sendPushToClient` call.
- Mutation-tested: reverted `route.ts` only (`git stash`, test files kept)
  → the race test fails for the right reason (both concurrent calls return
  200 instead of one 409). Restored, all 3 pass.
- Existing `checkout/route.test.ts` (13 tests, pricing-model/auth-guard
  coverage) required one addition to its shared mock builder — a
  `maybeSingle()` branch alongside the existing `single()` — since the fix
  changes the update call's method; no assertions changed. All 13 still
  pass.
- Full `src/app/api/team-portal/*` suite: 34 files / 140 passing, 1 skipped
  (pre-existing skip, unrelated), no regressions. (First run from the repo
  root instead of `platform/` produced 27 spurious `Cannot find package
  '@/lib/...'` failures — a path-alias resolution artifact of running
  vitest from the wrong cwd, not a real failure; confirmed by re-running
  from `platform/` cleanly.)
- `npx tsc --noEmit`: clean on changed files. Same 2 pre-existing unrelated
  errors as every prior report this session
  (`bookings/broadcast/route.xss.test.ts`, `sunnyside-clean-nyc/_lib/site-nav.ts`).

## Files touched

- `platform/src/app/api/team-portal/checkout/route.ts` — atomic
  in_progress->completed claim before notify (~15 lines).
- `platform/src/app/api/team-portal/checkout/route.test.ts` — added
  `maybeSingle()` to the shared mock builder (required for the route change;
  no test assertions changed).
- `platform/src/app/api/team-portal/checkout/route.double-checkout-race.test.ts`
  — new, 3 tests.

## Noticed (not fixed — advisory, unchanged from prior reports)

- Payroll `comp_type`/`pay_rate_cents` gap (12:55 + 16:21 reports): still
  live, still an explicit ambiguous-design-intent judgment call flagged for
  leader sign-off, not touched again this round.
