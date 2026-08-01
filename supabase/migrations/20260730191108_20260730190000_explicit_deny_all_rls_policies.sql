-- Adopted from legacy hand-run migration: 20260730190000_explicit_deny_all_rls_policies.sql
-- Original commit date (git first-add): 2026-07-30T15:11:08-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- Confirmed genuinely live in prod (not just "assumed") by sec-06's
-- 2026-07-31 live_http_check: real anon-key PostgREST requests against 3 of
-- these tables (tenants, platform_settings, security_events) returned
-- HTTP 200 empty-array against tables holding real rows -- the exact
-- deny-all behavior this migration's policies produce.
--
-- sec-08 finding (2026-08-01): this file previously existed ONLY at
-- platform/supabase/migrations/20260730190000_explicit_deny_all_rls_policies.sql
-- -- a SEPARATE, accidentally-created, disconnected local Supabase CLI
-- project (project_id "platform", never linked to prod via `supabase link`,
-- created by commit 47bc4acf8) that is NOT this real, prod-linked project.
-- It was never picked up by scripts/migrate-legacy-to-cli.mjs's baseline
-- conversion and so was silently absent from the real tracked baseline
-- until converted here by hand. See docs/adr/0008-migration-tool-cutover.md's
-- 2026-08-01 addendum for the full writeup of the duplicate-directory issue.

-- sec-06: explicit deny-all RLS policies for tables that had RLS enabled
-- with zero policies.
--
-- IMPORTANT CONTEXT (see docs/security/rls-policy-review-2026-07-30.md for
-- the full writeup): this is NOT a fix for a live vulnerability. In
-- Postgres, "RLS enabled + zero policies" already means default-deny for
-- every role except one with BYPASSRLS (Supabase's service_role has it).
-- This platform runs every real query through service_role
-- (src/lib/tenant-db.ts's own header comment documents this), and a full
-- repo sweep found zero browser/anon-key code that ever queries these
-- tables directly (the only anon-key usage anywhere in the app is Storage
-- bucket uploads, a completely separate policy system). There is also no
-- Supabase Auth usage anywhere in this app (tenant/client/team auth is
-- entirely custom signed-cookie/token based), so a "real" per-tenant RLS
-- policy keyed on auth.uid()/JWT claims is not meaningfully achievable in
-- this architecture regardless.
--
-- What this migration actually does: makes the existing default-deny
-- posture EXPLICIT instead of implicit, for audit-trail/compliance
-- purposes and as a guard against a future misconfiguration. Zero
-- functional change to any current code path.

-- Tenant-owned application tables (have a tenant_id column; still no
-- meaningful anon/authenticated access path exists, per above).
create policy "deny_all_anon_authenticated" on public.booking_assignees for all to anon, authenticated using (false);
create policy "deny_all_anon_authenticated" on public.contacts for all to anon, authenticated using (false);
create policy "deny_all_anon_authenticated" on public.crew_members for all to anon, authenticated using (false);
create policy "deny_all_anon_authenticated" on public.geo_nearby_places_cache for all to anon, authenticated using (false);
create policy "deny_all_anon_authenticated" on public.inbound_emails for all to anon, authenticated using (false);
create policy "deny_all_anon_authenticated" on public.tenant_locations for all to anon, authenticated using (false);
create policy "deny_all_anon_authenticated" on public.tenant_notes for all to anon, authenticated using (false);
create policy "deny_all_anon_authenticated" on public.tenant_projects for all to anon, authenticated using (false);
create policy "deny_all_anon_authenticated" on public.user_preferences for all to anon, authenticated using (false);

-- Pre-tenant / cross-tenant-by-design tables (no tenant_id column at all --
-- confirmed live against prod's information_schema.columns).
create policy "deny_all_anon_authenticated" on public.crm_notes for all to anon, authenticated using (false);
create policy "deny_all_anon_authenticated" on public.inquiries for all to anon, authenticated using (false);
create policy "deny_all_anon_authenticated" on public.leads for all to anon, authenticated using (false);
create policy "deny_all_anon_authenticated" on public.partner_requests for all to anon, authenticated using (false);

-- Platform-global tables (no tenant ownership concept at all).
create policy "deny_all_anon_authenticated" on public.platform_announcements for all to anon, authenticated using (false);
create policy "deny_all_anon_authenticated" on public.platform_settings for all to anon, authenticated using (false);
create policy "deny_all_anon_authenticated" on public.rate_limit_events for all to anon, authenticated using (false);
create policy "deny_all_anon_authenticated" on public.tenants for all to anon, authenticated using (false);

-- Platform AI-ops-agent (Jefe) internal state -- platform-staff-only by design.
create policy "deny_all_anon_authenticated" on public.jefe_acks for all to anon, authenticated using (false);
create policy "deny_all_anon_authenticated" on public.jefe_messages for all to anon, authenticated using (false);
create policy "deny_all_anon_authenticated" on public.jefe_snapshots for all to anon, authenticated using (false);
