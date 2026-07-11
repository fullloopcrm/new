-- Backstop for the double cleaner-payout fix (W2, 2026-07-11).
-- Enforces at most ONE payout row per booking so a duplicate payout can never be
-- RECORDED, complementing the app-layer cleanerAlreadyPaid() guard that stops the
-- duplicate transfer from firing.
--
-- booking_id is NULLABLE on team_member_payouts (some payouts aren't booking-
-- linked), so this is a PARTIAL unique index scoped to rows that have a booking_id.
--
-- ⚠️ DO NOT RUN until existing duplicates are reconciled. A prior double-payout
-- would already have written 2 rows for one booking, and creating this index will
-- FAIL while those exist. Find them first:
--
--   SELECT tenant_id, booking_id, count(*)
--   FROM team_member_payouts
--   WHERE booking_id IS NOT NULL
--   GROUP BY tenant_id, booking_id
--   HAVING count(*) > 1;
--
-- Reconcile (refund/void the extra transfer, delete/void the extra row) before
-- applying.

CREATE UNIQUE INDEX IF NOT EXISTS uq_payouts_tenant_booking
  ON team_member_payouts (tenant_id, booking_id)
  WHERE booking_id IS NOT NULL;
