-- Team Announcements: replaces the broken single-blob "Guidelines" feature
-- (tenants.guidelines_en/es -- team-facing read pointed at a nonexistent
-- tenants.settings column, and the admin Broadcast button called a route
-- that doesn't exist). This is a running feed admin can keep posting to,
-- global for every tenant.

CREATE TABLE IF NOT EXISTS team_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title_en TEXT,
  title_es TEXT,
  body_en TEXT NOT NULL,
  body_es TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_announcements_tenant ON team_announcements(tenant_id, created_at DESC);

ALTER TABLE team_announcements ENABLE ROW LEVEL SECURITY;
