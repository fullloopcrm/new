-- Adopted from legacy hand-run migration: 016_outreach_log.sql
-- Original commit date (git first-add): 2026-04-20T11:04:29-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- 016_outreach_log.sql
-- Per-tenant dedup for the seasonal outreach cron. One row = one (tenant, client, moment)
-- combination already texted, so re-runs of the cron don't double-text.
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/016_outreach_log.sql

BEGIN;

CREATE TABLE IF NOT EXISTS outreach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  moment_id text NOT NULL,
  message text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outreach_log_dedup UNIQUE (tenant_id, client_id, moment_id)
);

CREATE INDEX IF NOT EXISTS idx_outreach_log_tenant_moment
  ON outreach_log(tenant_id, moment_id);

COMMIT;
