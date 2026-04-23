-- 046_rls_deny_on_new_tables.sql
-- Defense-in-depth: enable RLS with deny-all policies on tables created
-- earlier in this build. Service-role (the key our API routes use)
-- BYPASSES RLS, so this is a no-op for current code paths. But if any
-- future route migrates to a user-scoped JWT, these tables cannot leak.

-- impersonation_events: who-impersonated-whom audit log. No user should
--   ever see these directly; service role only via /admin/security/* routes.
alter table impersonation_events enable row level security;
drop policy if exists "deny_all_impersonation_events" on impersonation_events;
create policy "deny_all_impersonation_events" on impersonation_events
  for all to public using (false) with check (false);

-- portal_auth_codes: SMS verification codes. Obviously no direct user access.
alter table portal_auth_codes enable row level security;
drop policy if exists "deny_all_portal_auth_codes" on portal_auth_codes;
create policy "deny_all_portal_auth_codes" on portal_auth_codes
  for all to public using (false) with check (false);

-- verification_codes: email/sms verification codes for client dashboard login.
alter table verification_codes enable row level security;
drop policy if exists "deny_all_verification_codes" on verification_codes;
create policy "deny_all_verification_codes" on verification_codes
  for all to public using (false) with check (false);

-- tenant_domains: tenant's domain aliases. Read-only from middleware lookup,
--   always via service role. Owner might eventually manage these via admin UI —
--   at that point, switch deny-all to a tenant-scoped policy.
alter table tenant_domains enable row level security;
drop policy if exists "deny_all_tenant_domains" on tenant_domains;
create policy "deny_all_tenant_domains" on tenant_domains
  for all to public using (false) with check (false);
