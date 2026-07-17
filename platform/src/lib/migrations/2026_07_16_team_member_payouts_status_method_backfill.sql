-- ===========================================================================
-- 2026_07_16_team_member_payouts_status_method_backfill.sql
-- Prod-data cleanup for a live app bug just fixed on p1-w2:
-- /api/admin/bookings/[id]/cleaner-payout (manual Zelle/Venmo/CashApp/cash
-- payouts) wrote the payment METHOD into team_member_payouts.status instead
-- of the dedicated `method` column added by migration 010. status is meant to
-- hold a delivery STATE ('pending'|'transferred'|'paid'|...) — post-labor.ts's
-- PAID_PAYOUT_STATUSES check and backfillUnpostedLabor's safety-net scan both
-- filter on it, so every manual cleaner payout ever recorded through that
-- route is invisible to both the ledger poster and its own backfill net:
-- none of them have ever reached the ledger or the payroll-prep paid_out
-- total, for as long as this route has existed.
--
-- This is a data-repair migration, not a schema change. It moves the
-- misfiled value into `method` and sets `status` to a real completed state
-- so the EXISTING cron/finance-post safety net (backfillUnpostedLabor) can
-- find and post these rows on its next run — no app code change needed to
-- pick them up once this lands.
--
-- FILE-ONLY — not applied. Leader/Jeff runs this against prod after review.
-- Safe to re-run (idempotent: only touches rows still holding a method
-- string in status with no method set yet).
-- ===========================================================================
update team_member_payouts
set method = status,
    status = 'paid'
where method is null
  and status in ('zelle', 'venmo', 'cashapp', 'cash', 'other');

-- After this runs, trigger a cron/finance-post run (or call
-- backfillUnpostedLabor per-tenant) to post the newly-visible payouts to the
-- ledger. Until then they'll sit correctly-labeled but still unposted.
