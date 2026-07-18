# Stripe refunds reversed the ledger but never synced payments/bookings/invoices (2026-07-18 01:07)

## Fresh-ground discovery

Continuing the money-accuracy sweep (after the job_payments revenue-posting
gap), I looked at the other direction of money movement — refunds — since
`postRefundToLedger` already exists and is wired into `charge.refunded`
(`src/app/api/webhooks/stripe/route.ts`).

The ledger side is correct: `postRefundToLedger` posts `DR 4000 Service
Revenue / CR 1050 Undeposited Funds`, idempotent by Stripe refund id. But
tracing what ELSE that handler touched turned up nothing:

- `payments.status` — never updated. A refunded payment's row stays
  `'succeeded'`/`'completed'` forever.
- `bookings.payment_status` — never updated by the webhook. `grep` for
  `'refunded'` found exactly one writer in the whole codebase:
  `src/lib/selena/tools.ts`'s `handleProcessStripeRefund` (the AI assistant's
  `process_stripe_refund` tool) sets `bookings.payment_status = 'refunded'`
  immediately after it itself calls `stripe.refunds.create()` — but that only
  covers refunds issued *through that one tool*. A refund issued directly
  from the Stripe Dashboard, or Stripe's own dispute-resolution refund, hits
  `charge.refunded` with no corresponding app-side actor to patch the
  booking — and the webhook did nothing.
- `invoices.status`/`amount_paid_cents` — driven by a DB trigger
  (`invoices_recompute_paid`, `027_invoices.sql`) that only fires on an
  INSERT/UPDATE/DELETE against the `payments` row. Since nothing ever updated
  the payments row on refund, the trigger never re-fired, and the invoice
  kept showing `'paid'`/full `amount_paid_cents` after the money came back.

Dug into the trigger itself and found a second, independent bug baked in:
`invoices.status` has `'refunded'` in its own CHECK constraint (line 15 of
027_invoices.sql) but the trigger's CASE can never produce it — its only
branches are `'paid'` and `'partial'`, and the `'partial'` branch explicitly
excludes `inv_status = 'paid'` (`inv_status NOT IN ('paid','void','refunded')`)
so once an invoice reached `'paid'` there was no way back, even if the
`payments` row HAD been updated correctly. Same "declared status, zero
writer" shape as the go-live checklist `'blocked'` status fixed earlier this
session (`0a3dabde`) — this time on the money-accuracy rail: AR aging, the
client-facing invoice page, and any admin view reading
`invoices.status`/`amount_paid_cents` would keep reporting "paid in full"
after a real refund, no matter how the refund was issued.

Net effect before this fix: **the GL was the only accurate record of a
refund.** Every operational surface a human or the AI assistant actually
reads (payments list, booking payment badge, invoice status, AR aging)
continued to say the client paid in full.

## Fix (file-only, no push/deploy/DB)

- **`src/lib/finance/post-adjustments.ts`** — extended
  `tenantFromPaymentIntent`'s return shape with `paymentId`, `amountCents`,
  `status` (in addition to the existing `tenantId`/`bookingId`) so the
  webhook's refund handler has what it needs to sync the payment row without
  a second query. Backward compatible: `charge.dispute.created` (the other
  caller) only ever read `tenantId`/`bookingId` and is unaffected.
- **`src/app/api/webhooks/stripe/route.ts`**'s `charge.refunded` case — after
  posting to the ledger (unchanged), if a payment resolved and
  `charge.amount_refunded > 0` and the payment isn't already `'refunded'`
  (terminal — also guards against a stale/out-of-order redelivery of an
  earlier, smaller `amount_refunded` clobbering a more-complete later state):
  classifies full vs partial by comparing `charge.amount_refunded`
  (cumulative across every refund on the charge, per Stripe's own semantics —
  no running total to maintain) against the payment's own original
  `amount_cents`, then sets `payments.status` to `'refunded'` or
  `'partially_refunded'`, and — if the payment is booking-linked — the same
  value on `bookings.payment_status`. The `payments` UPDATE is what re-fires
  `trg_payments_recompute_invoice` for invoice-linked payments; no separate
  invoice-side code needed.
- **`src/lib/migrations/2026_07_18_invoices_refund_status_trigger.sql`**
  (file-only, not run) — `CREATE OR REPLACE FUNCTION invoices_recompute_paid()`
  with a corrected CASE: `'void'`/`'refunded'` stay terminal (matches the
  original guard's intent — a stray late payment row shouldn't silently
  reopen a voided/refunded invoice); `total_paid >= inv_total` → `'paid'`;
  `0 < total_paid < inv_total` → `'partial'` (now reachable FROM `'paid'`,
  where the old CASE blocked it); `total_paid <= 0` coming from
  `'paid'`/`'partial'` → `'refunded'` (the actual declared-but-unwritten
  status, now writable). No backfill — this only changes future trigger
  firings; retroactively rewriting invoices already stuck `'paid'` after a
  past refund is a data-cleanup call for the leader/Jeff, not something a
  schema migration should do silently.

`REVENUE_STATUSES` in `post-revenue.ts` (`['completed','succeeded','partial']`)
already excludes `'refunded'`/`'partially_refunded'` by construction, so
`backfillUnpostedRevenue`'s scan naturally stops considering a refunded
payment "unposted revenue" going forward — no change needed there, verified
by reading, not assumed.

## Verification

- New tests in `src/app/api/webhooks/stripe/refund-dispute-wiring.test.ts`
  (`charge.refunded → payments/bookings status sync`, 4 new cases): full
  refund marks both payment + booking `'refunded'`; partial refund
  (`amount_refunded < amount_cents`) marks both `'partially_refunded'`;
  invoice-only payment (no `booking_id`) still syncs the payment row without
  touching a nonexistent booking; a stale redelivery with a smaller
  `amount_refunded` than an already-`'refunded'` payment does NOT downgrade
  it back to `'partially_refunded'`. All 4 pass; the 7 pre-existing wiring
  tests in the same file (ledger-post args, memo shape, no-tenant/no-intent
  no-ops) still pass unmodified — they set `adj.resolved` without the new
  `paymentId` field, so the new sync branch's guard (`resolved.paymentId &&
  …`) correctly no-ops for them, same as it will for any other caller shape
  I didn't anticipate.
- `tsc --noEmit --pretty false`: 0 new errors (same 5 pre-existing baseline
  errors as the last several passes this session — stale `.next` admin-auth
  types, two unrelated cron test files' spread-argument typing, untracked
  `sunnyside-clean-nyc/site-nav.ts` import names — none touch this change).
- `eslint` on all touched files: 0 errors, 0 new warnings.
- Full suite: `npx vitest run` — 623/623 files, 3331 passed + 1 pre-existing
  expected-fail (net +4 tests, 0 new files, 0 regressions).
- The SQL trigger fix could not be exercised by this suite (the webhook tests
  run against an in-memory JS fake, not real Postgres, so no test here
  observes the trigger firing) — flagged, not silently assumed correct. The
  leader/Jeff should confirm the trigger logic against a real invoice +
  refunded-payment row before/after applying it.

## Not fixed / flagged, not touched

- `src/lib/selena/tools.ts`'s `handleProcessStripeRefund` still
  unconditionally sets `bookings.payment_status = 'refunded'` right after
  issuing the Stripe refund, even for a partial-amount refund — imprecise,
  but harmless now: the webhook's own correct sync (this fix) overwrites it
  with the accurate `'refunded'`/`'partially_refunded'` value once
  `charge.refunded` lands, which happens on every real refund regardless of
  who issued it. Left untouched — fixing Selena's optimistic early write
  would be polish on a value the webhook always corrects moments later, not
  a fresh bug.
- Did not backfill any tenant's already-refunded historical
  payments/bookings/invoices that are stuck showing "paid in full" from
  before this fix — per standing rules this is file-only/no-DB; that's a
  one-time data-correction the leader/Jeff can run (or ask for) once this
  lands, scoped to whichever tenants actually have Stripe refund history.
- tenant_domains schema lane reconfirmed intact, no drift (043/055/056/068/
  069/2026_07_17_one_primary_per_tenant unchanged; this pass touched
  payments/bookings/invoices, an unrelated table family).

File-only. No push/deploy/DB.
