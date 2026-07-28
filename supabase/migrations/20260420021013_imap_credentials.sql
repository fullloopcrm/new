-- Adopted from legacy hand-run migration: 012_imap_credentials.sql
-- Original commit date (git first-add): 2026-04-19T22:10:12-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- Tenant IMAP credentials for the email-monitor (Zelle/Venmo detection)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS imap_host TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS imap_port INTEGER DEFAULT 993;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS imap_user TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS imap_pass TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email_monitor_enabled BOOLEAN DEFAULT false;
