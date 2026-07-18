-- 2026_07_18_quotes_linked_job_id.sql
-- Change orders: reuse the existing Sales proposal pipeline instead of a new
-- system. A proposal created against an EXISTING job (not a new sale) sets
-- quotes.linked_job_id -- on accept, the app attaches new job_payments rows
-- to that job instead of creating a duplicate job via convertSaleToJob (see
-- src/lib/jobs.ts). jobs.total_cents is never touched by a change order --
-- the original contracted amount stays its own number; accepted change
-- orders are summed on top of it for display only.
--
-- Additive + nullable + reversible. ON DELETE SET NULL mirrors the existing
-- quotes.converted_job_id pattern (026_quotes.sql / 2026_07_02_jobs_projects.sql)
-- -- a proposal should survive its linked job being deleted.

alter table quotes
  add column if not exists linked_job_id uuid references jobs(id) on delete set null;

create index if not exists idx_quotes_tenant_linked_job
  on quotes (tenant_id, linked_job_id)
  where linked_job_id is not null;
