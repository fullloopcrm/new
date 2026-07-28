-- Adopted from legacy hand-run migration: 048_leads_settings_columns.sql
-- Original commit date (git first-add): 2026-04-25T11:05:07-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- 048_leads_settings_columns.sql
-- Add real columns for fields the leads page settings panel and the
-- global settings page reference but never had a real home.
-- Pre-existing UI was edit-only-no-storage.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS attribution_window_hours integer DEFAULT 24;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS lead_notification_email text;
