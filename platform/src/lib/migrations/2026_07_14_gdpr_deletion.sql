-- GDPR/CCPA right-to-be-forgotten: deletion request workflow.
--
-- FILE-ONLY. Not applied to any database. Requires Jeff's approval + the
-- leader to run this against prod. Do not run this migration yourself.
--
-- Flow: a request soft-deletes the client immediately (clients.active=false)
-- and starts a 30-day grace period during which it can be cancelled. Once
-- the grace period elapses, a daily cron purges the request: PII columns on
-- the client (and its invoices/SMS history) are irreversibly overwritten,
-- but the rows themselves — and therefore booking counts, revenue totals,
-- and other tenant-level aggregates — are preserved.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS gdpr_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'completed')),
  requested_by TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_purge_at TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gdpr_deletion_requests_tenant
  ON gdpr_deletion_requests(tenant_id, client_id);

-- Cron sweep: "give me every request due for purge" without a tenant filter.
CREATE INDEX IF NOT EXISTS idx_gdpr_deletion_requests_due
  ON gdpr_deletion_requests(status, scheduled_purge_at) WHERE status = 'pending';

-- A client can only have one deletion request in flight at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_gdpr_deletion_requests_one_pending
  ON gdpr_deletion_requests(client_id) WHERE status = 'pending';
