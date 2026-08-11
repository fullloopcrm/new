-- Lets a tenant deactivate a dashboard login (owner/admin/manager/staff/VA)
-- without deleting the tenant_members row/history. Deactivated members are
-- blocked from PIN and Clerk login (see admin-auth, mobile/auth/login,
-- mobile/unified-login, tenant-query.ts) and any already-issued session
-- token is rejected on its next per-request re-check.
ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
