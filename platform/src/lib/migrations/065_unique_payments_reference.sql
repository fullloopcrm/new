-- 065_unique_payments_reference.sql
-- FILE ONLY -- do NOT execute here. Leader runs after Jeff approves.
--
-- WHY: payments has no uniqueness backing (tenant_id, booking_id,
-- reference_id) at all (column added in migration 020, zero constraint since).
-- processPayment() (payment-processor.ts) is the canonical non-Stripe
-- (Zelle/Venmo/cash/admin-confirmed) payment path used by both
-- team-portal/checkout (deterministic `cleaner-checkout-${bookingId}` ref) and
-- admin/payments/finalize-match (reconciliation, internal-key-gated). It sums
-- prior payments then INSERTs a new row with no DB-level guard: two concurrent
-- calls carrying the SAME reference_id (a double-tapped checkout button, a
-- client retry after a timeout, or a redelivered finalize-match reconciliation
-- request) both read the same prior-payments sum before either insert
-- commits -- double revenue posted to the ledger AND a duplicate
-- team_member_payouts row (double labor cost posted). The actual Stripe
-- transfer/instant-payout calls are separately idempotency-keyed already, so
-- no double money leaves the platform, but the books go wrong.
--
-- Partial unique index (not a full UNIQUE constraint) because most payment
-- methods don't carry a caller-supplied reference_id -- NULLs must not
-- conflict, same as every other partial-uniqueness fix this session
-- (064_unique_journal_entries.sql, idx_team_members_tenant_pin_unique).
--
-- payment-processor.ts's processPayment() is updated in the same commit to
-- catch 23505 on the payments insert and return an idempotent no-op (skip
-- ledger post, Stripe transfer, payout row, all SMS) instead of proceeding --
-- but that catch is inert (unreachable) until this index actually exists in
-- prod. Migration + JS fix must land together.

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_tenant_booking_reference_unique
  ON payments(tenant_id, booking_id, reference_id)
  WHERE reference_id IS NOT NULL;
