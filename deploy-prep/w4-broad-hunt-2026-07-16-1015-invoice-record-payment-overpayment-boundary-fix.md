# W4 broad-hunt — 2026-07-16 10:15 — adversarial pass (trade lifecycle continued)

## Order
10:15 LEADER->W4: Continue adversarial/break-things testing across trade
lifecycle. File-only, no push/deploy/DB.

## Scope this round
Prior sessions already hardened bookings/quotes/deals RBAC + race conditions
(client/book, quotes/public/accept, stripe webhook, recurring-date drift,
booking-overlap trigger). This round targeted adjacent trade-lifecycle money
endpoints not yet covered by filename in deploy-prep history: invoices
record-payment, job payments, admin cleaner-payout, quote-to-job conversion,
client reschedule, payment finalize-match.

## Fixed

### 1. Manual invoice payment recording had no upper bound vs. remaining balance (this round)
`POST /api/invoices/[id]/record-payment` (staff-gated on `finance.expenses`,
used for Zelle/Venmo/cash/check payments that don't flow through Stripe)
validated `amount_cents` was a positive number but never checked it against
the invoice's actual remaining balance (`total_cents - amount_paid_cents`).
The DB trigger `invoices_recompute_paid()` (`027_invoices.sql`) sums all
`payments` rows for the invoice unconditionally, so a wildly-oversized amount
(typo, or two-tabs/retry double-submit of the same manual entry) inflates
`amount_paid_cents` past `total_cents` with nothing to stop it — the invoice
still resolves to `status: 'paid'`, but `balance_cents` (computed as
`total_cents - amount_paid_cents` and returned to the UI) goes negative and
the books show more collected than was ever billed. The frontend
(`dashboard/sales/invoices/[id]/page.tsx`) has no max-amount validation on
its plain-text input either, so this is trivially reachable from the normal
"Record Payment" dialog by anyone with the permission, not just an API
caller. Notably, the sibling flow `api/finance/mark-paid` explicitly guards
against exactly this class of problem ("Idempotent: only create a payment
row if the booking has none yet — avoids double-recording a Stripe/Zelle
payment that already posted") — `record-payment` was missing the equivalent
balance guard. Fixed: reject with 400 when `amount_cents` exceeds the
invoice's current remaining balance, computed from the same row already
fetched for the void/refunded check. `tip_cents` is unaffected (separate
column, not counted toward the balance) so legitimate tip-on-top payments
still work unchanged.

## Checked, found already race-safe / clean (no code changed)
- **Quote → job conversion** (`createJobFromQuote` in `lib/jobs.ts`, backing
  `POST /api/quotes/[id]/convert-to-job`): genuine atomic-claim pattern —
  concurrent callers race a conditional UPDATE on
  `status='accepted' AND converted_job_id IS NULL AND converted_at IS NULL`;
  the loser gets `null` back and returns the winner's `job_id` instead of
  creating a duplicate job/payment-plan/bookings. Correctly handles the
  Stripe-webhook-retry-races-first-delivery case called out in its own
  comments.
- **Job payment-plan status flips** (`PATCH /api/jobs/[id]/payments`): no
  attacker/caller-controlled amount in this path — `amount_cents` lives on
  the pre-created `job_payments` row and this endpoint only flips
  `status`/`paid_at`, so the overpayment class of bug in finding #1 doesn't
  apply here.
- **Zelle/Venmo reconciliation finalize-match** (`api/admin/payments/
  finalize-match` -> `lib/payment-processor.ts`): internal-key-gated
  (`x-internal-key` compared with `safeEqual`), and `processPayment` already
  dedupes on `(booking_id, reference_id)` before inserting — a duplicate
  reconciliation-tool delivery of the same Zelle reference is ignored with a
  logged warning, not double-posted.
- **Admin cleaner-payout** (`api/admin/bookings/[id]/cleaner-payout`): gated
  by the separate global-superadmin `admin_token` cookie system
  (`requireAdmin`/`verifyAdminToken`), not tenant-scoped `requirePermission`
  — consistent with every other route under `api/admin/*` (e.g.
  `closeout-summary`, same pattern, same trust tier). Booking lookup by `id`
  alone without a tenant filter is intentional here: this is the FullLoop
  cross-tenant staff panel, not a tenant-facing surface, so there's no
  tenant-boundary IDOR to flag. (Lack of an amount-vs-owed-pay cap on the
  payout amount itself is a fat-finger risk at most, at the same trust tier
  as the person who already has unscoped cross-tenant DB access via this
  panel — not pursued as a finding this round.)
- **Client self-service reschedule** (`api/client/reschedule/[id]`): already
  carries rate-limiting, tenant-scope verification on a caller-supplied
  `team_member_id` (prevents cross-tenant PII leak via the join), and relies
  on the same `trg_block_booking_overlap` DB trigger (fires on
  `UPDATE OF ... start_time, end_time ...` too, not just INSERT) for
  double-booking protection — same known TOCTOU window already filed as a
  proposed advisory-lock migration (`25786f59`), not a new gap. No
  start_time-before-end_time validation exists here, but that matches the
  original `client/book` creation path (same gap, same trust tier, no CHECK
  constraint on the `bookings` table enforcing ordering) — pre-existing
  pattern across the codebase rather than something introduced by reschedule,
  and cosmetic/scheduling-display risk rather than a money or auth boundary
  issue, so left as-is this round rather than expanding scope to a
  codebase-wide schema constraint change.

## Verification
- `npx tsc --noEmit --pretty false`: clean on the touched file; same two
  pre-existing unrelated failures as every prior session
  (`bookings/broadcast/route.xss.test.ts` mock-typing,
  `sunnyside-clean-nyc/_lib/site-nav.ts` stale import) — untouched, present
  before this session.
- Traced the fix against the actual trigger math in `027_invoices.sql`
  (`invoices_recompute_paid()`) to confirm the balance computation used for
  the new guard matches what the trigger itself sums, rather than assuming.
- No test file added, consistent with this session's established pattern for
  route-level input/boundary-validation fixes (no pre-existing test file for
  this route either).
- File-only: no push, no deploy, no DB DDL/migration needed for this fix
  (pure application-layer validation, no schema change).

## Commits this round
- (pending commit) fix(security): cap invoices/record-payment amount at
  remaining balance to stop overpayment/double-submit ledger corruption

Idle, awaiting next order.
