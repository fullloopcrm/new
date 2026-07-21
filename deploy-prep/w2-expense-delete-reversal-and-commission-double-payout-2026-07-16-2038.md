# W2 — 20:26 queue: project archetype depth + fresh ground (2026-07-16)

File-only. No push/deploy/DB. tsc clean throughout. Mutation-verified both fixes
(git apply -R the specific diff, confirm new tests go red for the right reason,
restore, confirm green).

## (1) Project archetype depth — expenses DELETE now reverses its ledger entry

**Gap closed:** half of missing-feature gap #5 from the 19:52 report ("PUT/DELETE
/api/finance/expenses/[id] does not reverse or repost the now-existing ledger
entry — editing an expense's amount/category, or deleting it, leaves a
stale/wrong journal entry behind").

DELETE /api/finance/expenses/[id] never touched the ledger. Every expense POST
fires `postExpenseToLedger` immediately (fixed earlier this session, commit
d9205361) — so by the time an expense is deleted, it very likely already has a
posted `journal_entries` row (source='expense'). Deleting the expense left that
entry behind forever with nothing pointing back to it: a permanent phantom
cost silently overstating expenses / understating net profit on the default
P&L, with **no possible future remediation** (unlike an unposted expense,
which `backfillUnpostedExpenses` can still find and fix later — there's no
equivalent backfill that could ever discover an orphaned entry once its
source expense row is gone).

**Fix:** added `reverseExpenseFromLedger` (`src/lib/finance/post-expense.ts`) —
reads the ORIGINAL entry's own posted lines (not the current expense row) and
posts the exact opposite of each line under a new `source='expense_reversal'`
key, idempotent per expense. Wired into DELETE
(`src/app/api/finance/expenses/[id]/route.ts`), called **before** the delete
and **blocking** it if the reversal fails for a real reason (not
`no_original_entry`/`already_reversed`) — deliberately not best-effort like
the original POST-time posting, because there's no safety net downstream to
catch a failure here. 13 new tests (4 in `post-expense.test.ts` incl. a
cross-tenant isolation check, 4 route-wiring tests, plus the existing 5/4
untouched), mutation-verified.

**Deliberately NOT fixed — PUT (edit amount/category):** migration 061's
`UNIQUE(tenant_id, source, source_id)` means the `'expense'` key can only ever
hold one journal entry, ever. A clean reverse-then-repost that supports
*more than one* edit over an expense's lifetime while still preserving the
original entry for audit needs either (a) a schema change (versioned source
keys / a revision column) or (b) accepting delete-and-repost of the posted
entry itself (loses the pre-edit history, but consistent with the fact that
nothing in this codebase enforces `journal_entries.period_locked` yet — see
the still-open period-lock gap below). That's a real design choice, not a
one-line follow-up to the DELETE fix — flagging for scoping, not guessing.

**Also noticed, not fixed:** an expense that reached the ledger via the
*bank-match* path instead of the immediate-post path (source='bank_txn',
keyed to the bank transaction id, not the expense id — see
`bank-transactions/[id]/match/route.ts`) is NOT covered by this reversal —
deleting that expense still orphans the bank_txn-sourced entry. Rarer path
(requires reconciliation to have already run against this specific expense)
but a real residual gap.

## (2) Fresh ground — referral-commissions PUT double mark-paid double-counted total_paid

**Real money-accuracy bug**, same class as several fixed elsewhere this
session (duplicate-submission / missing CAS on a state-changing write with a
side-effecting increment). `PUT /api/referral-commissions` (marking a
commission paid) called `increment_referrer_paid` (the atomic RPC from
migrations/2026_07_13_referrer_ledger_atomic.sql) **unconditionally** whenever
the request body said `status:'paid'` — with no check on the commission's
*current* status first. That RPC only closes the lost-update race between
TWO DIFFERENT commissions for the same referrer; it does nothing to stop the
SAME commission being marked paid twice (double-click, or a client retry
after a slow/dropped response) from incrementing `total_paid` a second time
for money that was only ever disbursed once.

`postCommissionPayment`'s own idempotency (`journalEntryExists`) already
protects the *actual* ledger journal entry from posting twice — so the real
cash-movement accounting was correct — but the referrer's `total_paid` stat
(what operators actually look at, and would reconcile against real
disbursements before cutting a next payout) would silently drift high by
however many times the mark-paid request fired.

**Fix:** the mark-paid branch now does a CAS update first —
`.update({status:'paid',...}).eq('id',id).eq('tenant_id',tenantId).neq('status','paid').select(...).maybeSingle()`
— and only calls `increment_referrer_paid` + `postCommissionPayment` if a row
was actually claimed (i.e., this call is the one that transitioned it out of
non-paid). A second call for the same commission is a real no-op: 0 rows
matched, no RPC call, no ledger-post attempt. 2 new tests in the existing
`route.race.test.ts` (concurrent double-click via `Promise.all`, and a
sequential retry), mutation-verified — reverting the fix reproduces the bug
exactly (900→1800, 300→600 on the two new tests).

## Gap/fluidity — refreshed for the project archetype

No standalone master gap/fluidity file exists in this repo (per W4's 20:15
confirmation) — filing this as the pattern: one timestamped deploy-prep report
per landed round, refreshing the list inline.

**MISSING-FEATURE GAPS** (unchanged unless noted):
1. no per-job costing (expenses/payroll_payments still have no job_id).
2. no time tracking (hourly comp_type still unexercised anywhere in the
   archetype — none of roofing/remodeling/interior_design use it).
3. no job-level materials/subcontractor cost capture (same root cause as #1).
4. no payroll batch/run concept.
5. **PARTIALLY CLOSED THIS ROUND** — expenses DELETE now reverses its ledger
   entry. PUT (edit) still does not; needs a schema/design decision (see
   above), not guessed at.
6. `GET /api/finance/payroll-prep`'s `?year=YYYY` 1099 mode is still dead code
   (only live caller always uses from/to) and still undercounts
   already-`status='paid'` bookings — unchanged, still flagged, still not
   fixed (needs a product decision on whether 1099 totals should include
   already-paid bookings).
7. period-lock: finance write endpoints (including the two touched this
   round) still don't check `accounting_periods` / `journal_entries.period_locked`
   — still open, still not mine to decide (W1's flagged gap, unchanged).

**UX-FRICTION** (unchanged):
1. change orders have no dedicated feature (manual total-bump + job_payments
   insert workaround, no structural link).
2. cancellation kill-fees are ad hoc math, no stored policy field, no audit
   trail for the %.

## Verification

- tsc --noEmit clean after each change.
- Mutation-verified both fixes independently (git diff → apply -R → confirm
  new tests red for the right reason → restore → confirm green).
- Full repo suite: 469/469 files, 2137 passed + 37 skipped, 0 regressions
  (baseline 468/468 2128+37). One transient timeout on an unrelated,
  untouched test (`finance-export.test.ts`'s 200k-row generation case,
  >5s under full-suite parallel load) — re-ran that file alone and it passed
  in 1.4s; not caused by this round's changes.
