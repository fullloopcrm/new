-- Tenant IMAP credentials for the email-monitor (Zelle/Venmo detection)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS imap_host TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS imap_port INTEGER DEFAULT 993;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS imap_user TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS imap_pass TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email_monitor_enabled BOOLEAN DEFAULT false;
