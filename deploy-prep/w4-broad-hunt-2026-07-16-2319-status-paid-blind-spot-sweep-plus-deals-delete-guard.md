# W4 session report — 23:05 queue

LEADER order: fresh 3-deep queue (1) continue cross-archetype HR/payroll/
finance depth. (2) continue fresh-ground hunting. (3) keep gap/fluidity
current. File-only, no push/deploy/DB.

## (1) Archetype depth — swept the status='completed'-only blind spot to every remaining report it touches

Last session's gap report flagged `finance/pnl`'s `?source=raw` path and
`finance/summary`'s labor/job-count figures as "found this session, same
root cause as ar-aging/pending, not fixed — lower priority." Picked that up
and, while tracing every place `bookings.status='completed'` is queried
without `'paid'`, found the same bug recurring in four more places. All six
share one root cause: `status` (job/team-pay lifecycle: scheduled → ... →
completed → paid) and `payment_status` (the CLIENT's own payment) are
independent fields, and POST `/api/finance/payroll` (bulk payroll) flips a
booking's `status` straight to `'paid'` once the TEAM MEMBER is paid —
**without ever setting `team_member_paid`**. Any query filtered on
`status='completed'` only loses the booking entirely the instant payroll
runs on it; any query that separately splits "paid" vs "owed" on the
`team_member_paid` flag (instead of also treating `status='paid'` as
settled) trades that bug for the opposite one — showing already-paid labor
as still owed.

Fixed, each with new tests, each mutation-verified (reverted, confirmed the
new tests fail for the right reason, restored):

1. **`finance/pnl?source=raw`** — `cost_of_service_cents` silently dropped
   a bulk-paid booking's team pay (understating cost, overstating gross
   profit); `unpaid_cents` silently dropped it too even with the client
   still owing. Commit `bf6bc9aa`.
2. **`finance/summary`** — week/month/year labor totals and job counts
   dropped bulk-paid bookings entirely (undercounting). Fixed the paid/owed
   split too (`sumPaidLabor`, `pendingCleanerPayments`) to treat
   `status='paid'` as settled — a naive status-filter-only widen would have
   made bulk-paid labor show up as still OWED instead of paid, the
   opposite bug. Commit `bf6bc9aa`.
3. **`finance/cleaner-income`** (cleaner-facing "how much have I
   earned/been paid" report) — a bulk-paid booking vanished from a
   cleaner's own pay history entirely; fixed with the same
   status='paid'-means-settled guard so it now shows as paid, not unpaid.
   Commit `219396e8`.
4. **`team-portal/crew/earnings`** (crew-lead pay roll-up, the most
   sensitive team-portal permission per its own comment) — a bulk-paid job
   dropped out of the trailing-30-day earnings total. No paid/unpaid split
   here (pure gross figure) so no double-count trap — straight status
   widen. Commit `0b21e670`.
5. **`finance/reconcile-candidates`** — same shape as the already-fixed
   ar-aging: a client-still-owes booking dropped out of bank-reconciliation
   suggestions once payroll ran on it. Commit `487d2a6e`.

Believe this closes the pattern for every *money-visibility* surface
(dashboards a human reads to answer "who owes/is owed what"). Two lower-
severity, display-only stragglers intentionally left (see gap list below).

## (2) Fresh ground — DELETE /api/deals/[id] had no delete-guard at all

Carried on the gap list for several sessions ("still open"). `deal_activities`
carries a NOT NULL `ON DELETE CASCADE` to `deals` (migration 011) — hard-
deleting a deal silently wiped its entire activity/audit trail, including
the `stage_change` log entry `POST /api/deals/[id]/stage` writes when a
deal closes 'sold' and the "Deposit $X paid — closed to Sold" note the
Stripe webhook writes on deposit payment. `quotes.deal_id` is `ON DELETE
SET NULL` *by design* ("deleting a deal never destroys the revenue record"
— migration `2026_07_03_quote_deal_link`), so the quote itself survives —
but that's exactly the case most worth blocking: an accepted/deposit-
paid/converted quote silently and permanently loses its only link to the
deal it closed, with zero confirmation step, reachable by anyone with
`sales.edit`.

Added `checkDealDeletable` (mirrors `booking-delete-guard`/
`client-delete-guard`): blocks hard-delete when the deal's own `stage` is
`'sold'`, or a linked quote carries real accept/deposit/conversion signal
(`status='accepted'`/`'converted'`, `deposit_paid_at` set, or
`converted_job_id` set). A lead that logged a follow-up note and never
converted stays deletable — matches the established "block on real
revenue, not on routine activity rows" philosophy from the booking guard.
7 new tests (lib-level `deal-delete-guard.test.ts` + route-level
`route.delete-guard.test.ts`), mutation-verified. Commit `df2fd97b`.

## (3) Gap/fluidity report

**MISSING-FEATURE / STRUCTURAL GAPS (not fixed — flagging for leader/Jeff):**

1. **New this session, same root cause, intentionally not fixed (display-
   only, lower severity):**
   - `finance/backfill` (fills missing `team_member_pay`/`actual_hours` on
     bookings) still filters `status='completed'` only. Edge case: a
     booking that bulk payroll paid via the hours×rate fallback (never had
     `bookings.team_member_pay` written) becomes permanently unreachable
     by this backfill once its status flips to `'paid'` — its
     denormalized `team_member_pay` column stays `null` forever even
     though real money was paid, which would show as `$0` pay on any
     report reading that column directly. Low-severity because it only
     bites the fallback path (most bookings DO have `team_member_pay` set
     before payroll runs); flagging rather than fixing to keep this
     session's diffs reviewable per-fix.
   - `admin/bookings` platform-admin stats tile: `stats.completed` counts
     `status==='completed'` exactly, with no `'paid'` bucket — a paid-out
     booking just disappears from every stat bucket (not completed, not
     scheduled, not cancelled). Cosmetic/display-only, genuinely ambiguous
     whether "Completed" should include "Paid" by product intent, so left
     for a product call rather than assumed.
2. **Carried, still open:** `team_pay`/`team_paid` (migration 009) vs
   `team_member_pay`/`team_member_paid` (migration 011) amount divergence
   — still a product call, not touched.
3. **Carried, still open:** two-going-on-three tenant-creation doors
   reimplement activation independently.
4. **Carried, still open:** `hr_document_reminders.document_id` NOT NULL
   constraint; `reviewed_by_name` migration drafted, not applied.
5. **Carried, still open:** `autoReplyReviews()` cron has no claim/lock.
6. **Carried, still open:** referrer `total_earned`/`total_paid` atomic-bump
   RPC migrations drafted, not wired into any call site.
7. **Carried, still open:** payments-table dedup index
   (`2026_07_13_payments_reference_dedup_PROPOSED.sql`) still unapplied —
   `processPayment()`'s reference_id idempotency is application-level only.

**UX-FRICTION (carried, unchanged):**
1. Hard-delete 409s (now including the new deal guard) don't offer an
   inline "cancel/mark lost instead?" action — same friction already
   flagged for bookings/clients/expenses.
2. HR onboarding badge/handoff gap and finance period-lock enforcement gap
   — block-vs-override policy isn't a worker's call.

## Verification

- `npx tsc --noEmit`: same 3 pre-existing baseline errors
  (`bookings/broadcast/route.xss.test.ts`, `sunnyside-clean-nyc/_lib/
  site-nav.ts` ×2), confirmed present before this session's changes on
  every check. Zero new errors introduced by any fix in this session.
- `npx vitest run` on `src/app/api/finance`, `src/app/api/deals`,
  `src/app/api/team-portal`, `src/lib/deal-delete-guard.test.ts`: all green,
  zero regressions, each new test file passing standalone too.
- Mutation-verified all 6 fixes individually (stashed just that file's
  diff, confirmed the new tests fail for the right reason, popped the
  stash to restore).
- Commits: `bf6bc9aa` (pnl raw + summary status='paid' blind spot),
  `df2fd97b` (deals delete-guard), `219396e8` (cleaner-income status='paid'
  blind spot), `0b21e670` (crew/earnings status='paid' blind spot),
  `487d2a6e` (reconcile-candidates status='paid' blind spot).
- File-only session: no push, no deploy, no prod DB writes.
