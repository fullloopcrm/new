# W4 broad-hunt — 2026-07-17 18:51 EDT — backfillRevenueFromBookings partial-payment ledger overstatement

Queue (18:39 LEADER order, 3-deep, file-only, no push/deploy/DB):
(1) new fresh-ground surface
(2) continue whichever surface (1) opens up
(3) keep gap/fluidity current

## (1) Fresh ground: `platform/src/lib/finance/`

Prior checkpoint (18:48) flagged `platform/src/lib/finance/` non-ledger,
non-report siblings of `ledger-reports.ts` as the highest-value next
fresh-ground target given the session's money-bug track record. Went
there.

## Fixed: `post-revenue.ts` `backfillRevenueFromBookings()` — partial-payment full-price ledger post

This session already found and fixed the same bug class — a `payment_
status: 'partial'` booking's FULL `price` being treated as collected
revenue instead of the actual `partial_payment_cents` received — across
five finance report surfaces: `dashboard`, `cash-flow`, `ar-aging`,
`summary`, `tax-export` (see `w4-broad-hunt-2026-07-17-0317-...` and
`-0400-...`). `backfillRevenueFromBookings()` in `lib/finance/post-
revenue.ts` had the identical bug and was missed.

This function is the safety-net/backfill path that posts ledger entries
straight from `bookings` rows (not the `payments` table) — the docstring
explains why: "the payments table is sparse/stale (most paid bookings have
no completed payment row)". It runs for real, unattended, on every active
tenant via `cron/finance-post` (`vercel.json` schedule), which is worse
than the report bugs: those misreported a number on screen; this one wrote
a permanent, wrong journal entry into the general ledger — DR Undeposited
Funds / CR Service Revenue for the booking's full price, even when only
`partial_payment_cents` had actually been received. The uncollected
remainder was booked as cash-in-transit that will never actually be
deposited, permanently overstating both revenue and the 1050 asset
balance for every partial-payment booking that ever needed this backfill
path (i.e. every one recorded outside the real-time `payments`-table flow
that `postPaymentRevenue()` covers).

Once a `(source='booking', source_id=bookingId)` slot is claimed by this
(wrong, full-price) backfill entry, it's claimed forever — there's no
later top-up correction, unlike the real-time path's `booking_topup`
mechanism for a second `payments` row. So this wasn't a transient
miscount; it was permanent for any booking that hit this path while
partially paid.

Fix: select `partial_payment_cents` alongside the existing fields. When
`payment_status === 'partial'`, post only `Math.max(0, partial_payment_
cents)` as both the Undeposited Funds debit and the Service Revenue
credit — no tip line, since which portion (if any) of a partial payment
is tip vs. service is unknowable. Fully-paid bookings are unaffected
(same `price + tip` / `price` / `tip` split as before). A partial booking
with `partial_payment_cents` unset (legacy data with no reliable signal)
now posts $0 rather than guessing the full price — matching the
conservative behavior already established in the five report fixes.

## Verification

- New test `post-revenue.backfill-partial-payment.test.ts` (3 cases):
  fully-paid booking posts full price+tip with the existing tip split
  (regression guard, unchanged behavior); partial booking posts only
  `partial_payment_cents`, never the full price; partial booking with no
  `partial_payment_cents` recorded posts nothing rather than guessing.
- `npx vitest run` on the new file plus the two existing `post-revenue.*`
  test files: 3 files, 10 tests, all green.
- `npx tsc --noEmit`: same pre-existing 3-error baseline confirmed via
  `git stash`/re-run (bookings/broadcast test mock typing ×1,
  sunnyside-clean-nyc site-nav import ×2), none introduced by this change.
- No push, no deploy, no DB write. 1 source file fixed
  (`lib/finance/post-revenue.ts`), 1 new test file.

## (2) Continued in the same surface

Reviewed the rest of `lib/finance/`'s previously-unconfirmed files for the
same or adjacent bug classes:

- `post-labor.ts` — clean. Both `postPayoutToLedger` and `postPayrollToLedger`
  post the row's own real `amount_cents`/`amount` (from `team_member_payouts`
  / `payroll_payments`), never an estimate or a price field — no partial-
  payment-style ambiguity is possible here.
- `reconcile.ts` — clean. `accountNetCents()` already carries the
  `.order('id')` + `.range()` pagination-order fix from the 0415 pass
  applied to this same pattern elsewhere; no new gap.
- `post-adjustments.ts` — re-verified my own initial read that its exports
  (`postDepositToLedger`, `postRefundToLedger`, `postChargebackToLedger`,
  `syncBookingRefundStatus`, `tenantFromPaymentIntent`) looked uncalled
  anywhere outside the file. That read was wrong — a `grep` run from the
  wrong cwd (worktree root instead of `platform/`) silently returned zero
  matches. Re-ran from the correct directory: all five are wired into
  `webhooks/stripe/route.ts` (`charge.refunded` → `postRefundToLedger` +
  `syncBookingRefundStatus`; `charge.dispute.created` → `postChargebackToLedger`;
  deposit checkout → `postDepositToLedger`) and Selena's
  `handleProcessStripeRefund` tool exists and is wired. No gap — correcting
  the record here so this false lead doesn't get re-chased later.
  `postCommissionPayment`'s own status check gap (doesn't independently
  verify `status !== 'void'`, relies on its only caller
  `backfillUnpostedCommissions` to pre-filter) is real but inert — zero
  other callers exist — so not worth a fix; noting only in case a future
  direct caller gets added without re-checking this.

## (3) Gap/fluidity

No change to the aging-items list from the 18:48 checkpoint — all still
open, unchanged. `lib/finance/` non-ledger-report siblings (this pass's
target) are now fully enumerated: `ledger-reports.ts` (18:13),
`post-revenue.ts` (this pass, fixed), `post-labor.ts`/`reconcile.ts`/
`post-adjustments.ts` (this pass, clean). The directory is now fully
covered.

## Next-target candidates if continuing fresh-ground hunting

- No specific next lead surfaced this pass. `lib/finance/` is now fully
  enumerated. Next fresh-ground pick should come from a broader sweep
  (e.g. a directory not yet touched this session) rather than continuing
  finance/payroll, which is now the most exhaustively covered surface per
  the 12:24 report's own note (120+ prior deploy-prep reports touch it).

No push/deploy/DB this pass.
