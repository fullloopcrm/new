-- PROPOSED — not yet applied to prod. File-only per worker rules; leader runs
-- prod DDL after Jeff approves.
--
-- Closes a double-post race in processPayment() (src/lib/payment-processor.ts),
-- the canonical non-Stripe (Zelle/Venmo/cash/cleaner-reported) payment path.
--
-- The function sums prior `payments` rows for a booking, decides paid vs
-- partial, then INSERTs a new payments row -- with no DB constraint backing
-- the (tenant_id, booking_id, reference_id) key at all. Two concurrent calls
-- with the SAME reference_id -- a double-tapped "check out" button in the
-- field app, a client-side retry after a timeout, or a redelivered
-- reconciliation-tool request to /api/admin/payments/finalize-match -- both
-- read the same prior-payments sum before either INSERT commits, so both
-- succeed: two payments rows for one real payment, double revenue posted to
-- the ledger (postPaymentRevenue keys on the new payment's own id, so the
-- existing journal_entries dedup constraint doesn't catch it -- each
-- duplicate row is a distinct source_id), and a duplicate team_member_payouts
-- row (the actual Stripe transfer/instant-payout calls already carry
-- idempotency keys scoped to bookingId+referenceId, so no double money
-- leaves the platform there -- but the duplicate payout row still
-- double-posts labor cost to the ledger for the same reason).
--
-- Fix: a partial unique index on (tenant_id, booking_id, reference_id) makes
-- the DB the real source of truth. payment-processor.ts was updated in the
-- same commit to catch the resulting 23505 on insert and return the existing
-- state as an idempotent no-op instead of proceeding to a second payout/SMS/
-- ledger post.

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_tenant_booking_reference
  ON payments (tenant_id, booking_id, reference_id)
  WHERE reference_id IS NOT NULL;
