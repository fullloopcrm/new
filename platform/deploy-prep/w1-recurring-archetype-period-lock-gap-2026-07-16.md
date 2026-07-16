# Recurring archetype (bookkeeping surface) — "locked" accounting periods enforce nothing

Scope: 19:29 queue item (2), continuing archetype depth on the HR/payroll/bookkeeping surface after the HR-onboarding-handoff doc. Analysis-only, grounded in code read this pass (`src/app/api/finance/periods/*`, `src/app/api/finance/expenses/*`, `src/app/api/finance/bank-transactions/*`, `src/app/api/finance/mark-paid`). Same shape as the middleware/`tenant_domains.routing_mode` dead-column finding from earlier this session: a control that visibly exists in the UI and writes real state, but nothing downstream reads it.

## The gap

`PATCH /api/finance/periods/[id]` (`src/app/api/finance/periods/[id]/route.ts:8`) lets an operator flip an `accounting_periods` row to `status: 'locked'` — the "close the books" action for a month/entity. It writes `locked_at`/`locked_by` correctly.

Grepped every finance write route for any reference to `accounting_periods` or period lock state: only the two files that manage the period rows themselves (`periods/route.ts`, `periods/[id]/route.ts`) ever touch that table. Every transaction-writing endpoint ignores it entirely:

- `POST /api/finance/expenses` — creates an expense for any `date`, no period check.
- `PUT /api/finance/expenses/[id]` / `DELETE /api/finance/expenses/[id]` — edits/deletes an expense regardless of whether its period is locked.
- `POST /api/finance/bank-transactions/accept-suggestions` — posts journal entries in bulk (up to 500 at once) for arbitrary `txn_date`s with zero period check.
- `POST /api/finance/mark-paid` — flips a booking to paid and posts a payment/revenue entry, no period check.
- `POST /api/finance/payroll` — (not read in depth this pass, but same absence in the grep) posts payroll runs with no period check.

So "locking" a period is purely decorative today: an admin can close March's books, and the UI will show the period as locked, but every write endpoint above will happily insert or edit a March-dated expense, accept a March bank-transaction suggestion, or mark a March booking paid — silently reopening the books the lock was supposed to freeze. The `checklist`/`notes` fields on `accounting_periods` reinforce that this was built as a real close-out workflow (a checklist implies a review gate), not just a label.

## Why this isn't a quick fix (why it's a doc, not a patch)

Unlike the single-endpoint TOCTOU races fixed elsewhere this session, this is a cross-cutting enforcement gap that needs a policy decision before any code changes:

1. **Which endpoints must check, and against which period?** Period is keyed on `(tenant_id, entity_id, year, month)`. Expenses have a `date` + optional `entity_id` — straightforward. But `accept-suggestions` processes up to 500 transactions per call, potentially spanning several periods/entities in one batch — does it skip locked-period transactions silently, or reject the whole batch, or need a per-row partial-success response shape (like it already has for `skipped`)?
2. **Hard block vs. override.** Real bookkeeping workflows need a "reopen with reason" escape hatch for corrections after close — `periods/[id]` already has `reopened_reason`, so the intent exists, but no write endpoint currently offers "this would violate a lock, want to reopen first?" as a guided flow; today it'd just be a flat 409.
3. **Backfill risk.** If enforcement goes in with a hard block, any tenant that has already locked a historical period (if any have used this feature) could suddenly find themselves unable to do something they were doing freely before — needs a check of current `accounting_periods` data before flipping enforcement on, not just a code change.

## Proposed next step (not built)

Add a single shared helper (e.g. `assertPeriodOpen(tenantId, entityId, date)` in `src/lib/finance/periods.ts`) that the write endpoints above call before their insert/update, returning 409 with the period id/status on a locked hit. This centralizes the check so it's one enforcement point instead of N copy-pasted queries, and gives a natural place to special-case bulk endpoints (`accept-suggestions`) to skip-and-report rather than hard-fail the batch. Flagging for leader/Jeff on the block-vs-override policy question before implementation — this is enforcement of an existing but currently-inert feature, not a new one, but it can change behavior for any tenant currently relying on the (accidental) ability to edit locked periods.
