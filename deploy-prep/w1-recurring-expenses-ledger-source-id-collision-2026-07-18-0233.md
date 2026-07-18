# A pending schema migration (064) would have silently stopped every recurring expense from posting to the ledger after its first occurrence (2026-07-18 02:33)

## Fresh-ground discovery (LEADER item 1)

Swept the ledger-posting call sites (`postJournalEntry()`, `src/lib/ledger.ts`)
against `064_unique_journal_entries.sql` — an already-authored, not-yet-applied
migration in this same lane that adds `UNIQUE INDEX ... ON journal_entries
(tenant_id, source, source_id) WHERE source_id IS NOT NULL` to close a
check-then-act double-post race (the fix another worker branch converged on
independently; see 064's own header). Checked every caller's `source_id`
shape against that new constraint: `booking`, `job_payment`, `payout`,
`payroll`, `refund`, `chargeback`, `commission`, `bank_txn` — all genuinely
one-shot event ids (a booking row, a payout row, a bank transaction row),
each existing exactly once, so the constraint is correct for all of them.

`cron/recurring-expenses/route.ts` was the one exception: it posts
`source: 'recurring'`, `source_id: r.id` where `r.id` is the
`recurring_expenses` **rule** row's id — the same id every time the cron
fires, for the entire life of the recurrence (monthly, quarterly, ...).
Once 064's unique index goes live, the SECOND real posting for any
recurring expense (a different `entry_date`, same rule id) would hit
`post_journal_entry`'s `ON CONFLICT (tenant_id, source, source_id) DO
NOTHING` and return `NULL` — and the route never checked that return value,
so it would advance `next_due_date` and log success anyway. Net effect: any
recurring expense that had already posted once would silently stop posting
to the ledger forever, with zero error surfaced anywhere — the P&L would
permanently understate real recurring costs (rent, subscriptions, loan
payments) from the second period on.

Worse than just "future postings break": 064's own pre-flight query
(`GROUP BY tenant_id, source, source_id HAVING COUNT(*) > 1`, meant to catch
real accidental duplicates before the index can be created) would flag
every ALREADY-multi-period recurring expense as a false-positive duplicate
and instruct whoever applies it to "keep the earliest entry, reverse/void
the rest" — i.e. it would tell a human to void real, correct historical
expense postings. `CREATE UNIQUE INDEX` would also fail outright on any
tenant with more than one existing posting for the same recurring row,
blocking 064 from applying at all until that (wrong) manual cleanup happened.

## Fix

Added `src/lib/uuid-v5.ts` — a small RFC 4122 v5 (namespace + name, SHA-1)
deterministic UUID implementation (no `uuid` package in this project's
dependencies), verified against the RFC's own published test vector.

Added `src/lib/finance/recurring-expense-ledger.ts` —
`recurringExpenseLedgerSourceId(recurringExpenseId, dueDate)`, a thin
wrapper deriving one stable id per (rule, period) pair: distinct across
periods (so 064's constraint stops blocking real postings), but stable for
the SAME period (so a retry of the same cron run still dedupes correctly —
same guarantee as before, at finer grain).

`cron/recurring-expenses/route.ts` now posts with this derived id instead
of the raw rule id, for both the dedupe pre-check SELECT and the actual
`postJournalEntry()` call.

## Backfill (LEADER item 2 — the surface (1) opened up)

Existing `source='recurring'` `journal_entries` rows (if the cron has
already fired in production) still use the OLD scheme (source_id = the rule
id), which is exactly what 064's pre-flight would misclassify. New
`src/lib/migrations/2026_07_18_recurring_expense_ledger_source_id.backfill.sql`
recomputes `source_id` for every such row using the identical v5 algorithm
in inline PL/pgSQL (pgcrypto's `digest()`, same version/variant byte
positions as the TS implementation) — same namespace UUID hardcoded in both
places, with an explicit comment in each that they must stay in sync.
Idempotent (only touches rows whose current `source_id` still resolves to a
live `recurring_expenses.id`, so a second run is a no-op). Updated 064's own
header to require this backfill run first and to explain why its pre-flight
hits on `source='recurring'` are not real duplicates.

## Files (file-only, no push/deploy/DB)

- `src/lib/uuid-v5.ts` — new. `uuidV5(namespace, name)`.
- `src/lib/uuid-v5.test.ts` — new, 5 tests: RFC 4122 published test vector,
  determinism, name-sensitivity, namespace-sensitivity, version/variant bits.
- `src/lib/finance/recurring-expense-ledger.ts` — new.
  `recurringExpenseLedgerSourceId()` + the fixed namespace constant.
- `src/app/api/cron/recurring-expenses/route.ts` — uses the derived
  per-period id for both the dedupe SELECT and `postJournalEntry()`.
- `src/lib/migrations/2026_07_18_recurring_expense_ledger_source_id.backfill.sql`
  — new. Recomputes `source_id` for existing `'recurring'` rows; must run
  before 064.
- `src/lib/migrations/064_unique_journal_entries.sql` — header comment only,
  documents the new prerequisite and why `'recurring'` pre-flight hits are
  false positives.

## Verification

- `tsc --noEmit --pretty false`: 0 new errors — same 5 pre-existing baseline
  errors as every pass this session.
- `eslint` on all 4 touched/added TS files: 0 errors, 0 warnings.
- New tests: 5/5 pass (`uuid-v5.test.ts`), including the RFC 4122 §Appendix
  A published test vector (DNS namespace + `www.example.org` →
  `74738ff5-5367-5958-9aee-98fffdcd1876`) — confirms the implementation is
  algorithmically correct, not just internally self-consistent.
- Existing `recurring-expenses/route.test.ts` (`advance()` date-stepper
  tests): 7/7 still pass, unaffected by this change.
- Full suite: `npx vitest run` — 631/631 files, 3361 passed + 1 pre-existing
  expected-fail (was 630/3356+1 before this pass, +1 file/+5 tests, 0
  regressions).
- SQL migration and backfill are file-only per lane rules — not executed
  against any database this session. The backfill's own idempotency
  (re-run-safe) and pre/post verification queries are documented inline for
  the leader to run before/after applying.

File-only, no push/deploy/DB. Both the app-code fix and the SQL backfill are
files under `src/lib/` per the schema+backfill lane; the leader applies the
backfill then 064 against prod, in that order, after Jeff approves.

## Noticed (not fixed, flagging per scope discipline)

- Did not check whether `recurring-expenses` cron has actually fired more
  than once for any tenant in production yet — that determines whether the
  backfill has real rows to migrate or is a no-op safety net. Either way the
  fix is needed before 064 can safely apply. Leader should run the
  pre-flight count query documented in the new backfill file's header to
  confirm exposure size before applying.
- Did not audit `post-labor.ts` / `post-adjustments.ts` / `post-revenue.ts`
  further for other "rule row reused as source_id" patterns beyond what was
  checked here — all six of their `source_id` values were confirmed to be
  genuinely one-shot event ids (payout row, payroll_payment row, refund
  event, etc.), so no other caller needed this fix, but a future new caller
  of `postJournalEntry()` could reintroduce the same class of bug if it
  reuses a persistent rule/config row's id instead of a per-occurrence id.
