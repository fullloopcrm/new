-- Allow a booking+team-member to be paid out in more than one installment
-- (e.g. base pay auto-paid at checkout, a tip that clears via Stripe minutes
-- later). uq_payouts_tenant_booking_member (2026-08-07) enforces AT MOST ONE
-- payout row ever per (tenant, booking, team_member) -- correct for
-- preventing a double-pay of the SAME money, but it also silently blocks a
-- second, genuinely different payout (a late tip, an overpayment) from ever
-- being recorded: the insert 23505s and every caller (webhook auto-pay,
-- payment-processor manual-report auto-pay, checkout-payout, and the admin
-- dashboard's manual "Team Paid" button) either skips or hard-errors.
--
-- Root-caused 2026-08-12: Sobeida Suero Perez's base pay ($93.00) was
-- auto-paid at checkout; Kim Abramson's $207 Stripe payment (incl. $20.70
-- tip) cleared 18 minutes later. cleanerAlreadyPaid() saw the existing row
-- and the webhook's auto-pay block skipped entirely -- no transfer attempt,
-- no error, no admin_task. The tip sat stranded with no path (automated or
-- manual) to ever pay it out.
--
-- Fix: key the uniqueness on WHICH payout event this row represents
-- (source_ref), not just which booking+person. Every claim-before-transfer
-- caller now passes a caller-specific source_ref (Stripe session id,
-- checkout-time marker, manual-report reference id, or a sweep-computed
-- key) so a genuinely new funding event can get its own row, while a retry
-- of the SAME event (same source_ref) still collides and is correctly
-- rejected.
--
-- Two indexes, not one:
--   1. WHERE source_ref IS NOT NULL -- every caller updated by this change
--      dedupes on (booking, member, source_ref).
--   2. WHERE source_ref IS NULL -- backstop for any caller not yet updated
--      (or a future one that forgets to pass it): behaves exactly like the
--      old index, at most one null-source_ref row per booking+member. Belt
--      and suspenders so a missed call site fails safe (blocks a possible
--      duplicate) rather than silently allowing a second unbounded payout.
--
-- Dup-probe (mandatory before a UNIQUE index per migration-runbook.md):
-- every existing row has source_ref NULL (column doesn't exist yet) and the
-- OLD index already enforced at most one row per (tenant, booking, member)
-- -- so index 2 above is guaranteed zero duplicates on creation. Safe to run
-- with no reconciliation step.

ALTER TABLE team_member_payouts ADD COLUMN IF NOT EXISTS source_ref text;

DROP INDEX IF EXISTS uq_payouts_tenant_booking_member;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payouts_tenant_booking_member_source
  ON team_member_payouts (tenant_id, booking_id, team_member_id, source_ref)
  WHERE booking_id IS NOT NULL AND source_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payouts_tenant_booking_member_nullsource
  ON team_member_payouts (tenant_id, booking_id, team_member_id)
  WHERE booking_id IS NOT NULL AND source_ref IS NULL;
