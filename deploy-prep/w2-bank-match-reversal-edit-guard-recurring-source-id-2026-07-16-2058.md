# W2 gap/fluidity refresh — 2026-07-16 20:58

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction), refreshed after this round's fixes. No master file (per W4's confirmed pattern) — this is a dated snapshot.

## Fixed this round (see commits 14f93ff1, b7f97a5e on p1-w2)

1. **`reverseExpenseFromLedger` didn't cover bank-txn-matched expenses.** An expense posted via bank reconciliation (source='bank_txn') instead of at creation survived its own deletion with the cost permanently un-reversed, and the bank_transactions row got stuck 'matched'/'posted' pointing at a deleted expense forever. Now reverses either source key and releases the bank_txn row back to 'categorized'.
2. **PUT /api/finance/expenses/[id] never touched the ledger.** Editing amount/category on an already-posted expense silently froze the journal entry at the old value. Now blocks the edit (409) — a real reverse-then-repost needs a schema decision (migration 061's UNIQUE(tenant_id,source,source_id) allows only one 'expense' entry ever), not attempted.
3. **cron/recurring-expenses silently stopped posting after the FIRST period, live on prod since migration 061 (applied 2026-07-16 14:35).** source_id was the recurring template's own id, reused every period; the 2nd+ period's post collided with migration 061's unique index and got silently resolved to the 1st period's entry id instead of erroring. Fixed with a per-occurrence deterministic UUID (`toSourceUuid`, now shared in ledger.ts). **This was a real, currently-live prod bug for however long between 14:35 and this fix landing — flagging for a leader/Jeff-run audit below.**

## NEEDS LEADER/JEFF ACTION — prod audit (I cannot run this, test-mode only)

Any tenant with an active recurring expense (`recurring_expenses.active=true`) whose frequency is short enough (daily/weekly/biweekly) to have fired more than once between 2026-07-16 14:35 and whenever this fix actually deploys may have silently-missing ledger periods. Suggested audit query once this fix is live:

```sql
-- Recurring templates that have fired (last_fired_at set) but whose journal_entries
-- count under source='recurring' doesn't match how many periods should have posted.
SELECT r.id, r.tenant_id, r.label, r.frequency, r.last_fired_at,
       (SELECT count(*) FROM journal_entries je WHERE je.tenant_id = r.tenant_id AND je.source = 'recurring' AND je.source_id::text LIKE '%')
FROM recurring_expenses r
WHERE r.active = true AND r.last_fired_at IS NOT NULL;
```
(Needs refinement — matching old-scheme source_id=r.id entries vs new-scheme hashed ones requires joining on both; I did not have live DB access to validate this query, treat as a starting point not a ready-to-run script.)

## MISSING-FEATURE GAPS (carried forward, unchanged unless noted)

1. No per-job costing (expenses/payroll_payments still have no job_id).
2. No time tracking (hourly comp_type still unexercised anywhere).
3. No job-level materials/subcontractor cost capture (same root cause as #1).
4. No payroll batch/run concept.
5. Expense edit/delete ledger gaps — **now fully closed** (this round + prior 2c7a9df9 pass covers both source='expense' and source='bank_txn' paths, plus the amount/category edit guard).
6. GET /api/finance/payroll-prep's ?year=YYYY 1099 mode is dead code (no frontend caller uses it) and undercounts if invoked (misses bookings already status='paid'). Not fixed — product decision needed.
7. job_payments.invoice_id exists but nothing sets/reads it — Job detail page's "$X collected" is fully disconnected from the real invoice/payment/ledger rail. Not fixed — feature decision needed.
8. **NEW:** recurring_expenses has no manual "run now" / catch-up mechanism — if a tenant's recurring expense goes inactive/reactivated after missing periods, there's no way to backfill the missed periods' ledger entries short of a manual expense entry per missed period.

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
