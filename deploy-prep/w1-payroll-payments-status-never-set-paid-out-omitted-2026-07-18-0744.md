# payroll_payments.status was never set to 'paid', and payroll-prep's paid_out_cents silently ignored the whole table (2026-07-18 07:44)

## Fresh-ground discovery

`POST /api/finance/payroll` ("Record Payment" — an admin recording a
payroll payment they already sent a team member via Zelle/cash/etc outside
the app) inserted a `payroll_payments` row leaving `status` and `paid_at`
untouched. Both silently stayed at their schema defaults —
`status='pending'`, `paid_at=null` (`008_missing_tables_and_columns.sql`) —
on every row this route has ever created, forever. This despite the same
request immediately calling `postPayrollToLedger()` to post the amount to
the ledger as an already-paid expense: the row's own state never reflected
what the app itself already treated as true.

Two concrete consequences, both live:

1. **Missing status gate on the ledger-posting rail itself.**
   `postPayrollToLedger` (`src/lib/finance/post-labor.ts`) had no status
   check at all — every OTHER money-in-motion table this exact module posts
   from (`payments` via `postPaymentRevenue`, `job_payments` via
   `postJobPaymentRevenue`, `team_member_payouts` via `postPayoutToLedger`)
   gates on a real "money actually moved" status before touching the
   ledger. `payroll_payments` was the one rail without that gate — a
   plausible future "schedule/draft payroll" row (`status` genuinely
   `'pending'`, no money sent yet) would post to the ledger as an
   already-paid expense the instant anything called
   `postPayrollToLedger`/`backfillUnpostedLabor` on it, with zero code
   protecting against that today, unlike every sibling posting function.
2. **`GET /api/finance/payroll-prep`'s `paid_out_cents` only ever summed
   `team_member_payouts`** (Stripe/auto contractor payouts) — it never
   queried `payroll_payments` (the manual Zelle/cash rail) at all. This
   report backs the "Balance owed" stat on `/dashboard/finance/reports`'
   **Payroll / 1099** tab (`StatCard label="Balance owed"`,
   highlighted amber when > 0) — a real, currently-rendered number. Any
   tenant using the manual "Record Payment" flow has had `balance_owed_cents`
   permanently overstated by the full amount of every manual payment ever
   recorded, since neither of the two bugs above canceled the other out
   (the ledger got posted correctly; the report reading a *different* table
   never saw it). Concrete failure: an admin pays a contractor $500 via
   Zelle, records it, then checks Payroll/1099 later — it still shows $500
   owed, inviting a real second payment.

`POST /api/finance/payroll` itself is real and permission-gated
(`finance.payroll`) with its own recent hardening (2026-07-16 dedup fix,
tested in `route.race.test.ts`) — this is an actively maintained surface,
not dead code.

## Fix (file-only, no push/deploy/DB)

- `src/lib/finance/post-labor.ts` — `postPayrollToLedger` now selects
  `status` and refuses to post unless `status === 'paid'` (mirrors
  `postPayoutToLedger`'s `PAID_PAYOUT_STATUSES` gate). `backfillUnpostedLabor`'s
  `payroll_payments` query now filters `.eq('status', 'paid')`, matching its
  own `team_member_payouts` query two lines above it in the same function.
- `src/app/api/finance/payroll/route.ts` — the insert now sets
  `status: 'paid', paid_at: <now>` — "Record Payment" means the money
  already moved; the row's own state now says so.
- `src/app/api/finance/payroll-prep/route.ts` — added a `payroll_payments`
  query (tenant-scoped, `status='paid'`, `created_at` date-windowed to match
  the existing `team_member_payouts` query style) and folded its amounts
  into `paid_out_cents` alongside the existing payouts loop.
- `src/lib/migrations/2026_07_18_payroll_payments_status_backfill.sql`
  (**file only** — not run) — every pre-existing `payroll_payments` row
  represents a real, already-completed payment (this route has no
  draft/schedule concept), so the backfill sets `status='paid'`,
  `paid_at = coalesce(paid_at, created_at)` for every row currently
  `status IS DISTINCT FROM 'paid'`. Idempotent (re-running matches zero
  rows), fail-loud verification block confirms zero rows remain unbackfilled.

## Test infra gap fixed along the way

`src/test/supabase-fake.ts` (the shared route-level Supabase fake) had
`.gte`/`.lt` but no `.lte` — the exact operator `payroll-prep`'s existing
`bookings`/`team_member_payouts` date-window queries already used, and the
one my new `payroll_payments` query needed too. This route had zero prior
test coverage, so the gap was never hit. Added `.lte(col, val)` (stringwise
compare, matching `.gte`'s convention) to the shared fake's state/matcher/
chain — additive only, no existing test's query shape changed.

## Verification

- New test file `src/app/api/finance/payroll-prep/route.manual-payroll.test.ts`
  (4 tests): a paid manual payroll payment subtracts from `balance_owed_cents`;
  manual + Stripe/auto payouts combine correctly for the same member; a
  still-`'pending'` manual row is NOT counted; another tenant's manual
  payroll never leaks in.
- New tests in `src/lib/finance/post-labor.test.ts`: `postPayrollToLedger`
  rejects a non-`'paid'` status instead of posting it; `backfillUnpostedLabor`
  skips a pending payroll row (added `bf_pr_pending` alongside the existing
  `bf_po_pending` case).
- Updated `seedPayroll` test helper (post-labor.test.ts) to default
  `status: 'paid'`, matching `seedPayout`'s existing convention, so every
  pre-existing test in that file kept representing "a real paid payroll row"
  after the status gate landed.
- Fixed one incidental regression this surfaced:
  `src/lib/finance/entry-date-et-boundary.test.ts` seeded a `payroll_payments`
  row with no `status`, which the new gate correctly started rejecting —
  added `status: 'paid'` to that seed (it's testing ET-boundary date math,
  not payroll status, so this restores its original intent).
- RED-confirmed the two live-bug fixes together: saved a patch of the three
  non-test fix files, `git apply -R` to revert (not `git stash` — shared
  `.git` dir across workers, per this session's established convention),
  re-ran the new tests — `postPayrollToLedger`'s status-gate test and all
  three affected `payroll-prep` assertions failed with the exact bug
  (payroll posted anyway; `paid_out_cents`/`balance_owed_cents` wrong by
  the manual-payment amount). `git apply` to restore, re-ran — all green.
- `tsc --noEmit --pretty false`: 0 new errors (same 5 pre-existing baseline
  errors — admin-auth route typing, two cron test files' spread-argument
  typing, sunnyside-clean-nyc's site-nav.ts import names — unchanged,
  confirmed via `git stash`/diff that these predate this change).
- `eslint` on every touched file: 0 errors. Two pre-existing
  `getTenantForRequest` unused-import warnings on the payroll/payroll-prep
  routes, confirmed via `git stash` to predate this change (not touched by
  this diff).
- Full `vitest run`: 669/669 files, 3474 passed + 1 expected-fail (3475),
  0 regressions (net +2 files/+24 tests: the two new test files plus the
  new cases added to `post-labor.test.ts`). The one interim failure
  (`entry-date-et-boundary.test.ts`, before its seed fix above) was this
  same status-gate landing correctly, not a regression in the fix itself.

tenant_domains schema lane reconfirmed intact, no drift. No tenant_domains
schema change needed — this was an application-layer money-spine fix
(status gate + report aggregation) plus a data-only backfill for an
existing, unrelated table.

File-only. No push/deploy/DB.
