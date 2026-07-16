# W4 broad-hunt — 2026-07-16 11:59

## Finding: manual cleaner-payout endpoint had no double-payout guard (FIXED)

**File:** `platform/src/app/api/admin/bookings/[id]/cleaner-payout/route.ts`

### Context

The codebase established a clear invariant across the two automated payout
paths (Stripe Connect):

- `src/lib/payment-processor.ts` (Zelle/manual-reconciliation-triggered auto-pay)
- `src/app/api/webhooks/stripe/route.ts` (`checkout.session.completed` auto-pay)

Both claim `bookings.team_member_paid` atomically via a conditional
`UPDATE ... WHERE team_member_paid IS NULL OR team_member_paid = false`
*before* sending money, specifically to prevent double-transferring to a
team member for the same booking. This pattern was hardened across several
of today's earlier fixes (`47f76ee2`, `bcb87921`, `40ccbb76`).

A third call site sets the same flag: `POST /api/admin/bookings/[id]/cleaner-payout`,
the endpoint an admin uses to manually record a Zelle/Venmo/CashApp/cash
payout. It never had the guard. It:

1. Inserted a `team_member_payouts` row unconditionally.
2. Then set `team_member_paid = true` with a plain `UPDATE ... WHERE id = ?` —
   no read of the current value, no atomic claim, no rejection if already
   true.

### Impact

- A booking already auto-paid via Stripe Connect (`team_member_paid = true`)
  could still have a manual payout recorded against it with no warning —
  the endpoint would happily insert a second `team_member_payouts` row and
  "confirm" paid=true again. Since `finance/payroll` and `finance/pending`
  both key off `team_member_paid` to decide what's still owed, this doesn't
  automatically double-*pay* through the app, but it does let an admin
  record (and the ledger show) a real second manual payment for hours
  already auto-transferred — no server-side signal exists to stop it.
- No idempotency on double-submit: a double-click or a retried request after
  a slow/ambiguous response inserted two `team_member_payouts` rows and just
  re-set the same flag to `true` — undetectable duplicate.
- No protection against two admins recording a payout for the same booking
  concurrently.

### Fix

Applied the same atomic-claim pattern used by the other two payout paths:
before inserting the payout row (when the team member being paid is the
booking's lead — the only case that touches `team_member_paid`), issue the
conditional claim UPDATE. If it matches 0 rows (already paid), reject with
`409` and do not insert a payout row. If the payout insert itself then
fails after the claim succeeded, release the claim (mirrors the
claim-then-release invariant from `bcb87921`/`40ccbb76`) so the booking
doesn't look permanently paid-out with nothing recorded.

Regression test added:
`route.double-payout.test.ts` — 3 cases: normal payout claims + records,
already-paid booking rejects 409 with no insert, and two concurrent calls
for the same booking produce exactly one successful payout.

### Verification

- `npx tsc --noEmit` — no errors in the changed file (2 pre-existing,
  unrelated errors elsewhere in the tree: a vitest mock-typing issue in
  `bookings/broadcast/route.xss.test.ts` and a stale import in
  `site/sunnyside-clean-nyc/_lib/site-nav.ts` — not touched by this change).
- `npx vitest run` on the new test file: 3/3 pass.
- `npx vitest run src/lib/payment-processor*`: 9/9 pass (no regression on
  the adjacent auto-pay paths).

### Scope

File-only. No push, no deploy, no DB write against prod. Local commit only
in this worktree.
