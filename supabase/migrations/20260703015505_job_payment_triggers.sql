-- Adopted from legacy hand-run migration: 2026_07_02_job_payment_triggers.sql
-- Original commit date (git first-add): 2026-07-02T21:55:05-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- Payment release triggers — the universal money engine, one flow for all trades.
--
-- Each payment on a job's schedule carries its OWN release trigger. No per-trade
-- templates: cleaning = one 'manual' payment; a contractor = a deposit
-- 'on_signature' + milestones 'on_stage_complete' + a final 'on_date'. Same code
-- path, the data differs. When the matching job_event fires, the payment flips
-- pending → invoiced (due to collect). Real collection still flips it to paid.
--
--   manual            — operator marks it (default; the cleaning case)
--   on_date           — due when due_at passes (a daily cron releases these)
--   on_stage_complete — milestone: releases when a session/the job completes
--   on_signature      — deposit: releases when the job is created from a signed quote

ALTER TABLE job_payments
  ADD COLUMN IF NOT EXISTS trigger text NOT NULL DEFAULT 'manual'
    CHECK (trigger IN ('manual', 'on_date', 'on_stage_complete', 'on_signature'));

CREATE INDEX IF NOT EXISTS idx_job_payments_trigger
  ON job_payments(tenant_id, trigger, status);
