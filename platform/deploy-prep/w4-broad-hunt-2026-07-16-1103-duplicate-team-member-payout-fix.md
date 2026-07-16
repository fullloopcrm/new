# W4 — duplicate real Stripe payout to team member (money-flow), fixed

2026-07-16 11:03–11:09 EDT. Continued adversarial testing per LEADER
directive, focused on the money-flow surface after the checkin/checkout
status-gate fix.

## Finding

Neither `processPayment()` (`src/lib/payment-processor.ts`, used by
`/api/team-portal/checkout` and `/api/admin/payments/finalize-match`) nor
the Stripe webhook handler (`src/app/api/webhooks/stripe/route.ts`,
`checkout.session.completed`) checked whether a booking's team member had
**already been paid out** before firing a real `stripe.transfers.create` +
instant `stripe.payouts.create`.

Both paths only dedupe on a *payment-event* key (`(tenant_id, booking_id,
reference_id)` for Zelle/Venmo, `stripe_session_id` for Stripe Checkout) —
never on the booking itself. `team_member_payouts` also has no unique
constraint on `booking_id`. So any SECOND "full payment" resolution for the
same booking — under a genuinely different key — re-transferred real money
to the team member for a job already paid out:

- A client's Zelle payment reconciled twice under two different bank
  transaction refs (accidental double-send, or a corrected/resubmitted
  `finalize-match` call) → second call sees a fresh `referenceId`, isn't
  deduped, and re-runs the full payout section.
- The webhook's static pay-link path (`?client_reference_id=<bookingId>`,
  a *reusable* Stripe Payment Link per the code's own comments) paid twice
  → two distinct `session.id`s, neither one a webhook redelivery, so the
  session-id idempotency check doesn't catch it.

Net effect: the tenant's Stripe balance pays a contractor twice for one
job, with no admin step in between (the second instant payout lands in
the team member's bank before anyone could notice).

## Fix

Added a `team_member_paid` guard immediately before the transfer/payout
block in both files (selecting the column where it wasn't already
selected):

- `src/lib/payment-processor.ts`: added `team_member_paid` to the booking
  select; gated the auto-pay block on `!booking.team_member_paid`.
- `src/app/api/webhooks/stripe/route.ts`: same — added `team_member_paid`
  to the booking select; gated on `!booking.team_member_paid`.

A duplicate/second payment for the same booking still records as a
`payments` row (so revenue accounting isn't silently dropped) but no
longer re-transfers to the team member; `cleanerPaidCents` / `payoutSent`
reports 0/false for that call.

## Verification

- New regression test `src/lib/payment-processor.double-payout.test.ts`:
  two `processPayment()` calls for the same booking under two different
  `referenceId`s. Confirmed **fails without the fix** (2 transfers, 2
  payout rows) and **passes with the fix** (1 transfer, 1 payout row,
  second call's `cleanerPaidCents === 0`). Verified by `git stash`-ing the
  fix, re-running, and restoring.
- Existing suites still green: `payment-processor.duplicate-reference.test.ts`,
  `payment-processor.clientid-injection.test.ts`,
  `payment-processor.money-engine.test.ts` — 8/8 pass.
- `npx tsc --noEmit` — no new errors in either touched file (3 pre-existing,
  unrelated errors in the repo: a vitest-mock-typing issue in
  `bookings/broadcast/route.xss.test.ts` and two stale-export issues in
  `site/sunnyside-clean-nyc/_lib/site-nav.ts`, none touched by this change).

## Not covered / noted, not fixed

- `webhooks/stripe/route.ts` has no dedicated test file at all (only
  `payment-processor.ts` has unit coverage) — the webhook fix is
  type-checked and logically mirrors the tested `payment-processor.ts`
  fix, but isn't independently regression-tested here (would need
  Stripe-signature + full webhook-body mocking, out of scope for this
  pass). Flagging in case the leader wants that added before Jeff signs
  off.
- Separately (lower severity, not fixed): `/api/team-portal/checkout`'s
  NYC-Maid path lets the team member self-report
  `payment_method ∈ {cash, cashapp, apple_pay, credit_card}` with zero
  independent verification, and that self-report alone drives the same
  real Stripe transfer. That's an inherent trust boundary for a
  cash-collecting field-service model (matches the ported nycmaid
  behavior) rather than a new bug — flagging as a business-risk
  observation only, not touched.

File-only. No push/deploy/DB. Both fixes + new test committed to this
worktree; leader review requested before merge.
