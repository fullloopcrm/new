# W2 gap/fluidity refresh — 2026-07-16 21:15

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction), refreshed after this round's fixes. No master file (per W4's confirmed pattern) — this is a dated snapshot.

## Fixed this round (see commits e1b19859, b6051053 on p1-w2)

1. **Manual cleaner payouts (Zelle/Venmo/CashApp/cash) never reached the ledger.** `/api/admin/bookings/[id]/cleaner-payout` wrote the payment method into `team_member_payouts.status` instead of the dedicated `method` column (migration 010), and never called `postPayoutToLedger`. Every manual payout through this route was permanently invisible to both the ledger poster and `backfillUnpostedLabor`'s cron safety net (both filter on `status`), for as long as the route has existed. Fixed: `method` goes in `method`, `status` becomes a real `'paid'` state, route now posts to the ledger itself immediately.
2. **Same root cause broke `finance/payroll-prep`'s `paid_out_cents`.** Its filter checked `status` against `'paid'/'succeeded'/'completed'` — a vocabulary Stripe's own auto-payouts (`status='transferred'`) never matched either, so every contractor showed $0 paid-out and a full balance-owed regardless of actual payment history. Now shares `PAID_PAYOUT_STATUSES` (exported from post-labor.ts) with the ledger poster so the two agree.

## NEEDS LEADER/JEFF ACTION — prod data repair (I cannot run this, test-mode only)

File-only migration prepared: `platform/src/lib/migrations/2026_07_16_team_member_payouts_status_method_backfill.sql`. Moves the misfiled method-string out of `status` into `method` and sets `status='paid'` for existing rows. Once applied, the EXISTING `cron/finance-post` safety net (`backfillUnpostedLabor`) picks up and posts these rows to the ledger with no further app change — no separate posting step needed. Idempotent, safe to re-run.

## MISSING-FEATURE GAPS (carried forward, unchanged unless noted)

1. No per-job costing (expenses/payroll_payments still have no job_id).
2. No time tracking (hourly comp_type still unexercised anywhere).
3. No job-level materials/subcontractor cost capture (same root cause as #1).
4. No payroll batch/run concept.
5. Expense edit/delete ledger gaps — fully closed (prior round).
6. GET /api/finance/payroll-prep's `?year=YYYY` 1099 mode is dead code (no frontend caller) and undercounts if invoked. Not fixed — product decision needed.
7. job_payments.invoice_id exists but nothing sets/reads it — Job detail page's "$X collected" is fully disconnected from the real invoice/payment/ledger rail. Not fixed — feature decision needed.
8. `recurring_expenses` has no manual "run now" / catch-up mechanism for missed periods — **still open, still a real next design question, deliberately not building it.** No code path today lets a tenant backfill a period a recurring expense's cron missed (e.g. after being inactive/reactivated, or after the source_id collision bug fixed last round) short of a manual one-off expense entry per missed period. Any fix needs a product decision on: does "catch-up" mean posting the missed periods retroactively (dated in the past, distorting that period's historical P&L) or posting them all today (correct going-forward total, but the wrong period gets the cost)? Not something to guess at blind.
9. **NEW:** `GET /api/finance/payroll-prep` — the only 1099/contractor payroll report in the product — is structurally blind to any tenant paying crew through `payroll_payments` (i.e. every project-archetype trade: roofing/remodeling/interior_design). It only ever reads `bookings.team_member_pay` (gross) and `team_member_payouts` (paid-out), both cleaning-vertical booking-tracking columns; `createJobFromQuote`'s session bookings never populate `team_member_pay`, and project jobs never write to `team_member_payouts`. Result: every project-trade contractor shows $0 gross pay, $0 paid out, and `hits_1099_threshold=false` regardless of real payroll history — even though that same payroll correctly posts to the ledger (P&L is accurate; the 1099 prep report is not). Documented as two expected-to-fail checks in the archetype sim (commit b6051053), not fixed — real fix (payroll-prep also summing payroll_payments, or unifying the two payout-tracking tables into one) changes what "gross pay" vs "paid out" mean for this tenant type; a product decision, not a one-line patch. Flagging as likely HIGH priority given it's a compliance-adjacent report (1099 threshold detection) silently wrong for an entire vertical.

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
