# W4 — payroll GET flat-pay (team_member_pay) fix, 2026-07-16 13:15

## Context

Per 13:04 LEADER order: continue looping, following up on the payroll comp_type
gap flagged in `w4-broad-hunt-2026-07-16-1255-archetype-feature-gaps-...md`
(#2, recommended as highest-value next fix).

## Correction to prior framing

My 13:01 report called this "real money impact today, not hypothetical."
After tracing every caller of `GET/POST /api/finance/payroll`, that overstated
urgency — I did not verify liveness before writing it. Actual state:

- `src/app/dashboard/team/page.tsx` defines a `payroll` tab (letter F) but has
  **no render block for it** — clicking it shows nothing. Stub, not wired.
- `src/app/dashboard/finance/reports/page.tsx`'s live "Payroll / 1099" tab
  calls `/api/finance/payroll-prep`, a *different* route — not this one.
- No other `.tsx` in the app calls `/api/finance/payroll` (GET or POST); the
  only other hits are `admin/docs/page.tsx` (documentation text).

So `/api/finance/payroll` GET/POST currently has **no live UI caller** — the
bug was real but dormant, not actively mispaying anyone today. Flagging this
correction directly per the honesty rules rather than let the earlier
overstatement stand uncorrected.

## The actual bug (confirmed by reading code, not comp_type per se)

`GET /api/finance/payroll` computed every team member's `pending_pay` as
`hours × rate` unconditionally, ignoring `bookings.team_member_pay` — the
cents-denominated flat per-job amount that is the correct source of truth for
per-job/flat-fee comp (dumpster, junk removal, moving labor — my archetype;
`comp_type: 'per_job'` is the schema default). Three other places already
treat `team_member_pay` as authoritative when present:

- `src/lib/payment-processor.ts:255` (the real Stripe Connect auto-pay path)
- `src/app/api/team-portal/earnings/route.ts` (`jobPay()` helper)
- `src/app/api/finance/payroll-prep/route.ts` (sums `team_member_pay` directly,
  no hours fallback at all — this is the live payroll-prep view)

Only `finance/payroll/route.ts`'s GET never looked at the column. Effect if a
booking has `team_member_pay` set (a flat-fee job) and either (a) no
check-in/check-out recorded, or (b) a flat amount that differs from
hours×rate: this route showed $0 or a wrong amount pending for that worker.
POST just persists an admin-supplied `amount` (manual entry) — no fix needed
there.

## Fix

`src/app/api/finance/payroll/route.ts` GET: added `team_member_pay` to the
bookings select; pay computation now uses `team_member_pay/100` when set and
> 0, falling back to `hours × rate` only when no flat amount was recorded.
`pending_hours` still reflects actual worked hours (display/reporting), only
`pending_pay` changed. Same model as the three call sites above — no new
pattern introduced.

## Verification

- New test `route.flat-pay.test.ts`: two bookings for one worker, one with a
  $150 flat pay and no check-in/out, one with a $200 flat pay that would
  otherwise compute as $40 (2h × $20). Expected total $350.
- Mutation-verified: `git stash` on route.ts alone → test fails (`40` vs
  expected `350`, i.e. pre-fix only counts the hourly-calc booking) →
  `git stash pop` → test passes. Confirms the test is a real regression guard.
- Existing `route.double-payout.test.ts` (team_member_paid exclusion) still
  passes unchanged.
- Full `src/app/api/finance/` suite: 11 files / 28 tests passing.
- `npx tsc --noEmit`: only the same 2 pre-existing unrelated errors as prior
  W4 sessions (`bookings/broadcast/route.xss.test.ts`,
  `site/sunnyside-clean-nyc/_lib/site-nav.ts`) — neither touched by this change.

## Status

File-only, committed locally, no push/deploy/DB.
