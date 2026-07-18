# Marking a Job payment paid never posted revenue to the ledger (2026-07-18 00:55)

## Fresh-ground discovery

After the long sweep across cron/*, webhooks/*, and Clerk this session, this
pass looked outside those surfaces at the Jobs/Projects money rail — a
distinct feature from cleanings/bookings (`src/lib/jobs.ts`: "a cleaning
stays one booking; a project owns N bookings and N `job_payments` — deposit
→ progress → final/milestones").

`job_payments` is a completely separate table from `payments`: no
`method`/`tip_cents` columns, its own id space, and — per `src/app/dashboard/
jobs/[id]/page.tsx` (line 178) — the **only** thing that ever flips a row's
`status` to `'paid'` is the operator's manual "Mark Paid" click, hitting
`PATCH /api/jobs/[id]/payments`. That route updated `job_payments.status`
and logged a `job_events` timeline row — and stopped there. It never called
`postPaymentRevenue` or anything like it.

Confirmed this was a real, permanent gap, not just delayed posting:

- `src/lib/finance/post-revenue.ts`'s `backfillRevenueFromBookings` (the
  cron safety net) only scans `bookings.payment_status` — `job_payments`
  rows are invisible to it (a job's own child bookings, if any, carry no
  price/payment_status of their own; the money lives on the job's payment
  plan instead).
- `backfillUnpostedRevenue` only scans the `payments` table — also blind to
  `job_payments`.
- `cron/finance-post` (the scheduled safety net) wires the booking backfill
  + labor + commissions, but nothing that would ever catch a job_payment.

So every dollar of a Jobs/Projects milestone marked "paid" through the only
UI that exists for it was — and would forever remain — silently absent from
`journal_entries`, and therefore from P&L, trial balance, and balance sheet
(`finance/pnl`, `finance/trial-balance` are journal-entry-driven). Not a
race, not a delay — a rail that was simply never built, for a feature
(multi-session projects: landscaping, remodel, dumpster) that can carry
real, non-trivial money.

Related but distinct pre-existing flag found during this dig (`test(sim):
document job_payments/invoice_id money-rail gap in project archetypes`,
commit d63458dd, not in this branch): that documents `job_payments.invoice_id`
never being set/read to auto-sync from a real invoice payment. That's a
different gap (auto-sync from the invoice rail) from this one (the manual
click never posting revenue at all) — left untouched, still open, not
re-solved here.

## Fix (file-only, no push/deploy/DB)

- **`src/lib/finance/post-revenue.ts`** — added `postJobPaymentRevenue(opts:
  { tenantId, jobPaymentId })`, mirroring `postPaymentRevenue`'s shape:
  reads the `job_payments` row, requires `status === 'paid'`, posts
  `DR 1050 Undeposited Funds` / `CR 4000 Service Revenue` for the full
  `amount_cents` (no tip split — the column doesn't exist on this table),
  keyed `source='job_payment', source_id=<job_payment id>` so it can never
  collide with a booking- or payment-keyed entry (separate id space, same
  idempotency mechanism as every other source). Also added
  `backfillUnpostedJobPaymentRevenue(tenantId)`, the `job_payments` mirror of
  `backfillUnpostedRevenue`, for the safety net.
- **`src/app/api/jobs/[id]/payments/route.ts`** — after the status update
  and `logJobEvent`, on `status === 'paid'` calls `postJobPaymentRevenue`
  inside its own try/catch — best-effort, never fails the status flip
  itself (same "never block the money-in UI on the ledger" convention as
  `finance/mark-paid`).
- **`src/app/api/cron/finance-post/route.ts`** — wired
  `backfillUnpostedJobPaymentRevenue` into the per-tenant loop alongside the
  existing booking/labor/commissions backfills, added a `jobPayments` total
  to the response. Confirmed no double-count risk: separate table, separate
  `source` value, no overlap with the booking backfill's own dedup key.

## Verification

- Two new test files:
  - `src/lib/finance/post-revenue.job-payments.test.ts` — runs the real
    ledger spine (`postJournalEntry` + `ledger.ts`) against the shared
    in-memory fake (same convention as `money-spine.test.ts`): correct
    DR/CR split, non-paid status posts nothing, idempotent re-post, tenant
    isolation, and the backfill scan (posts only paid+unposted rows, skips
    already-posted ones). 6/6 passing.
  - `src/app/api/jobs/[id]/payments/route.revenue.test.ts` — route-level,
    real RPC-backed fake (same pattern as the existing
    `invoices/[id]/record-payment/route.revenue.test.ts` convention): marking
    paid posts one entry; re-marking paid doesn't double-post; marking
    `invoiced` posts nothing; a simulated ledger RPC failure still returns
    200 with the status flip intact. 4/4 passing.
- RED-confirmed: `git diff` of the 3 changed files saved to a patch,
  `git apply -R` to fully revert (not `git stash` — shared `.git` dir across
  all 4 worker worktrees), re-ran the 10 new tests — 8 failed for the exact
  predicted reason (`postJobPaymentRevenue is not a function` /
  `journal_entries` empty where 1 entry was expected); the 2 tests that
  don't depend on the fix (non-paid status, RPC-failure-tolerance-of-flip)
  passed either way as expected. Restored via `git apply`, re-ran — 10/10
  green again.
- `tsc --noEmit --pretty false`: 0 new errors (same 5 pre-existing baseline
  errors elsewhere — stale `.next` admin-auth types, two unrelated cron
  test files' spread-argument typing, untracked sunnyside-clean-nyc
  site-nav.ts import names — none touch this change).
- `eslint` on all touched/new files: 0 errors (1 pre-existing warning on
  `route.ts` — `getTenantForRequest` imported-but-unused, present before
  this change, not introduced by it).
- Full suite: `npx vitest run` — 623/623 files, 3327 passed + 1
  pre-existing expected-fail, 0 regressions (net +10 tests, +2 files).

## Not fixed / flagged, not touched

- `job_payments.invoice_id`/`stripe_payment_intent` auto-sync gap
  (documented by commit d63458dd on another branch) — a job_payment linked
  to a real invoice still requires the separate manual "Mark Paid" click
  even after the invoice itself is collected. Real, already flagged
  elsewhere, out of scope for this pass (this fix makes the manual click
  correct; it doesn't remove the need for it).
- Did not backfill any tenant's *historical* already-paid `job_payments` by
  actually running `backfillUnpostedJobPaymentRevenue` against a live DB —
  per standing rules this is file-only/no-DB; the leader/Jeff can run
  `cron/finance-post` (or call the function directly) once this lands to
  retro-post any pre-existing paid-but-unposted rows.
- tenant_domains schema lane reconfirmed intact, no drift (043/055/056/068/
  069/2026_07_17_one_primary_per_tenant unchanged; this pass touched an
  unrelated table).

File-only. No push/deploy/DB.
