-- Adopted from legacy hand-run migration: 2026_07_24_team_announcements.sql
-- Original commit date (git first-add): 2026-07-24T11:31:30-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
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
