# W4 broad-hunt — 2026-07-16 12:02

## Finding: referral-commissions mark-paid double-credited referrer.total_paid (FIXED)

**File:** `platform/src/app/api/referral-commissions/route.ts` (PUT)

### Context

Same class of bug as the cleaner-payout finding a few minutes earlier
(`57a30bb6`): a state-flip to "paid" that credits a real financial figure
with no guard against being applied twice to the same row.

`PUT /api/referral-commissions` marks a commission paid: it read the
commission + referrer, unconditionally added `commission_cents` to
`referrers.total_paid`, then updated the commission's `status` to `'paid'`
with a plain `.eq('id', id)` — no check that the commission wasn't already
`'paid'`. `postCommissionPayment` (the ledger-posting call) is internally
idempotent (`journalEntryExists` guard), so the GL itself was safe, but
`referrers.total_paid` had nothing protecting it.

### Impact

A double-click of "Mark Paid" in the finance UI, or a retried PUT after a
slow/ambiguous response, credited `total_paid` a second time for a
commission that was only ever paid once. `total_paid` is read by
`finance/tax-export` and `dashboard/finance/reports` — an inflated value
there overstates what was actually paid to a referrer in tax/financial
reporting.

### Fix

Claim the `'paid'` transition atomically: `UPDATE referral_commissions SET
... WHERE id = ? AND tenant_id = ? AND status != 'paid'`. Only credit
`total_paid` and post the ledger payment if the claim actually matched a
row; return `409` if the commission was already paid. Non-`'paid'` status
transitions are unchanged.

Regression test added: `route.double-payout.test.ts` — normal mark-paid
credits once, a second mark-paid on the same id rejects with 409 and
doesn't double-credit, and two racing mark-paid calls for the same
commission produce exactly one credit.

### Verification

- `npx tsc --noEmit` — no new errors (same 2 pre-existing unrelated errors
  noted in the prior report; not touched by this change).
- `npx vitest run src/app/api/referral-commissions` — 9/9 pass (includes
  the pre-existing `route.auth.test.ts` GET admin-gate test, unaffected).

### Scope

File-only. No push, no deploy, no DB write against prod. Local commit only
in this worktree.
