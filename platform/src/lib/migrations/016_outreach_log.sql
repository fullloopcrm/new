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
