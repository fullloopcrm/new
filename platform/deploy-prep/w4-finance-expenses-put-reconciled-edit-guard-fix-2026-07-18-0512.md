# W4 fix — finance/expenses/[id] PUT reconciled-expense edit guard

2026-07-18 05:12

## The bug

`DELETE /api/finance/expenses/[id]` already blocked hard-deleting an expense
once `matched_bank_transaction_id` is set — that field is only written by
`POST /api/finance/bank-transactions/[id]/match`, which also posts a real
journal entry for the cash outflow, and `tax-export`/`year-end-zip` read the
`expenses` table directly (not `journal_lines`). The DELETE guard's own
comment states the rationale clearly: destroying a reconciled expense row
would silently orphan the bank transaction's `matched_expense_id` (`ON DELETE
SET NULL`) and drop the vendor/receipt/category record backing an
already-posted ledger entry out of tax reporting, with no way to reattach it.

`PUT /api/finance/expenses/[id]` — the sibling verb on the exact same
resource — had **zero** equivalent guard. Any `finance.expenses`-permitted
tenant user could `PUT {amount, category, date, entity_id, ...}` onto an
already-reconciled expense and silently rewrite it: the amount/category/date
that tax-export and year-end-zip pull straight off this row would diverge
from what was actually matched to the bank transaction at match time, with no
trace and no unmatch endpoint to fix it. Same bug class as the `campaigns/[id]`
PUT/DELETE asymmetry fixed earlier this session, just on the finance/ledger
surface instead of campaigns — and arguably worse here, since the record
isn't deleted, it's quietly corrupted while still looking intact.

## The fix

Mirrored the DELETE guard on PUT: read `matched_bank_transaction_id` before
the update; if set, return 409 with a message matching DELETE's own wording
("...cannot be edited" vs. DELETE's "...cannot be deleted"). Added an atomic
CAS (`.is('matched_bank_transaction_id', null)` in the UPDATE's own WHERE
clause) so a match landing in the window between the guard read and the write
can't slip a stale edit through underneath it — same pattern as the
`campaigns/[id]` PUT fix and `documents/[id]` PATCH's existing
`.eq('status','draft')` claim.

Not-found and cross-tenant behavior on PUT were deliberately left untouched
(still surfaces as a 500 via the existing `.single()` error path) — changing
that to a 404 would have been a second, unrelated behavior change outside
this fix's scope, even though DELETE already does it that way.

## Continued the surface

Checked the other PUT/PATCH+DELETE resource pairs under `finance/`:
- `finance/bank-accounts/[id]` PATCH/DELETE — DELETE is a soft-deactivate
  (`active:false`), no status/reconciliation gate on either verb to be
  asymmetric about. Clean.
- `finance/entities/[id]` PATCH/DELETE — already carries a matched guard on
  BOTH verbs from an earlier session (the "cannot archive the default entity"
  check is evaluated against the *merged* final state on PATCH, not just
  DELETE). Clean, no asymmetry.
- `recurring-expenses/[id]` PATCH/DELETE — no status/reconciliation concept
  on this table at all; nothing to be asymmetric about. Clean.
- `documents/[id]/signers/[signerId]` PATCH/DELETE — already fully
  symmetric, both gated on the signer's own `status:'pending'` via atomic
  claim. Clean.
- `deals/[id]` PATCH/DELETE, `team-applications` PUT/DELETE — re-confirmed
  clean per the prior checkpoint (documents/[id] PATCH already had the
  status guard too).

No further instances of the "PUT/PATCH lacks the guard its sibling DELETE
already has" pattern found this pass beyond the one fixed.

## Verification

- New test file `route.reconciled-edit-guard.test.ts` (4 tests): unreconciled
  expense edits normally, reconciled expense PUT blocked with 409 + message
  matches `/reconciled/` + row unchanged, not-found still 500 (unchanged
  behavior), cross-tenant still 500 (unchanged behavior). RED confirmed
  before the fix (1/4 failing — the 409 case, got 200 instead), GREEN after.
- `npx vitest run "src/app/api/finance/expenses/[id]/"` — 3 files / 12 tests
  pass (existing `route.delete-guard.test.ts` + `route.mass-assign.test.ts`
  unaffected).
- `npx tsc --noEmit` — same 2 pre-existing baseline errors only
  (`sunnyside-clean-nyc/_lib/site-nav.ts`), no new errors.
- Full suite run in progress at time of writing; result to be confirmed in
  the commit/checkpoint follow-up.

No push/deploy/DB this pass.
