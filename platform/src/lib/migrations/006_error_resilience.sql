-- Migration 006: Error resilience infrastructure
-- Adds retry tracking, error logs table, and performance indexes

-- 1. Add retry_count to notifications for self-healing retry engine
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;

-- 2. Create error_logs table for centralized error tracking
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  message text NOT NULL,
  stack text,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  route text,
  action text,
  user_id text,
  metadata jsonb,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by text,
  resolution_notes text,
  created_at timestamptz DEFAULT now()
);

-- 3. Performance indexes for scale (critical for 1000+ tenants)
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_start ON bookings(tenant_id, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_status ON bookings(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_end ON bookings(tenant_id, end_time);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_created ON clients(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_email ON clients(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_phone ON clients(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_status ON notifications(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_type ON notifications(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_failed_retry ON notifications(status, retry_count) WHERE status = 'failed';
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_tenant ON error_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved ON error_logs(resolved, created_at DESC) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_team_members_tenant ON team_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);

-- 4. Missing tables referenced in code but never created

-- Google review sync (used by cron/sync-google-reviews)
CREATE TABLE IF NOT EXISTS google_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  google_review_id text,
  reviewer_name text,
  reviewer_photo_url text,
  rating integer,
  comment text,
  reply text,
  replied_at timestamptz,
  review_created_at timestamptz,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, google_review_id)
);

CREATE INDEX IF NOT EXISTS idx_google_reviews_tenant ON google_reviews(tenant_id, created_at DESC);

-- Lead/visitor click tracking (used by /api/track)
CREATE TABLE IF NOT EXISTS lead_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  domain text,
  session_id text,
  visitor_id text,
  page_path text,
  action text,
  load_time_ms integer,
  active_time integer,
  scroll_depth integer,
  cta_clicked text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  screen_w integer,
  screen_h integer,
  user_agent text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_clicks_tenant ON lead_clicks(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_clicks_domain ON lead_clicks(domain, created_at DESC);

-- 5. Add archived/expired/retrying statuses to notifications
-- (no enum change needed — status is text)

-- 5. Function to count errors by severity (used by admin dashboard)
CREATE OR REPLACE FUNCTION count_errors_by_severity(since_time timestamptz)
RETURNS TABLE(severity text, count bigint) AS $$
  SELECT severity, count(*)
  FROM error_logs
  WHERE created_at >= since_time
  GROUP BY severity
  ORDER BY count DESC;
$$ LANGUAGE sql STABLE;
