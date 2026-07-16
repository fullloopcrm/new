-- 2026_07_16_team_member_payouts_dedup.sql
-- POST /api/admin/bookings/:id/cleaner-payout (manual Zelle/Venmo/cash/other
-- team-member payout) had ZERO duplicate-submission protection -- no
-- idempotency check before the insert at all, not even the app-level
-- SELECT-then-check other money-write routes have (record-payment,
-- referral-commissions). A double-clicked "Pay" button, a retried request,
-- or two staff independently recording the same payout each insert their own
-- team_member_payouts row -- double-counting labor cost in every report that
-- sums this table (finance/payroll-prep, finance/summary, finance/year-end-zip,
-- the closeout-summary widget), even though the team member was only
-- actually paid once. (This route stores the payment METHOD in `status`
-- (e.g. 'zelle'), not a lifecycle state, so it never matches
-- post-labor.ts's PAID_PAYOUT_STATUSES and doesn't reach the ledger -- the
-- damage is confined to these reporting surfaces, not double book-keeping.)
--
-- Nullable dedup key, same two-layer shape as 065_unique_payments_reference.sql:
-- most payout rows (Stripe auto-transfer path in payment-processor.ts) don't
-- set this and are unaffected; the manual route populates it going forward
-- with a deterministic, time-bucketed key so a genuine retry within the
-- bucket collides at the DB level instead of silently duplicating.
--
-- Partial unique index (not a full UNIQUE constraint) so NULLs (every
-- historical row, and every Stripe-auto row) never conflict with each other.

ALTER TABLE team_member_payouts
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_member_payouts_tenant_idempotency
  ON team_member_payouts (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
