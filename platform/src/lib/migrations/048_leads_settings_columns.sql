-- 048_leads_settings_columns.sql
-- Add real columns for fields the leads page settings panel and the
-- global settings page reference but never had a real home.
-- Pre-existing UI was edit-only-no-storage.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS attribution_window_hours integer DEFAULT 24;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS lead_notification_email text;
