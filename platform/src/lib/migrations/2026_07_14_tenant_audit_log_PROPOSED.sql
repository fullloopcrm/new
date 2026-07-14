-- PROPOSED — FILE ONLY. NOT RUN. Requires Jeff's approval before any environment.
-- Author: worker W4, branch p1-w4, 2026-07-14, per LEADER order 08:58 (P9).
--
-- P9: audit logging expansion. Generalizes the impersonation_events pattern
-- (041_impersonation_audit.sql) from "impersonated sessions only" to "every
-- tenant-scoped write made through the request-authenticated path." Paired
-- with src/lib/audit-context.ts (per-request actor, via AsyncLocalStorage)
-- and the supabaseAdmin.from() write-interceptor in src/lib/supabase.ts —
-- see that file for how rows land here. Append-only, service-role-only.
--
-- impersonation_events is UNCHANGED and keeps its narrower job: "an admin
-- opened an impersonated session for tenant X." tenant_audit_log is the
-- superset ledger: "actor A performed action B on table C for tenant X,"
-- for every actor (impersonated or not) whenever getTenantForRequest()
-- resolved who's asking.
--
-- Known gap (by design, not an oversight): writes made outside the
-- getTenantForRequest() path — cron jobs, webhooks, and any public
-- unauthenticated endpoint that resolves its tenant a different way (e.g.
-- by domain lookup instead of getTenantForRequest) — have no actor in
-- audit-context.ts's AsyncLocalStorage, so they are silently NOT logged
-- here rather than logged with a fabricated actor. Those call sites use a
-- different actor model (system/webhook, not a human/admin session) and
-- are out of scope for this pass.

create table if not exists tenant_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_kind text not null check (actor_kind in ('pin_admin', 'clerk_super_admin', 'tenant_member_pin', 'clerk_user')),
  actor_id text not null,
  actor_role text,
  tenant_id uuid not null references tenants(id) on delete cascade,
  table_name text not null,
  action text not null check (action in ('insert', 'update', 'upsert', 'delete')),
  record_id text,
  path text,
  method text,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_tenant_audit_log_tenant_time
  on tenant_audit_log (tenant_id, created_at desc);

create index if not exists idx_tenant_audit_log_actor_time
  on tenant_audit_log (actor_id, created_at desc);

create index if not exists idx_tenant_audit_log_table_time
  on tenant_audit_log (table_name, created_at desc);

comment on table tenant_audit_log is
  'Append-only audit log: every insert/update/upsert/delete made via supabaseAdmin while a request-scoped tenant actor is known (see src/lib/audit-context.ts + src/lib/supabase.ts). Superset of impersonation_events.';

-- Defense-in-depth, matches 046_rls_deny_on_new_tables.sql: service-role
-- (the only key our API routes use) bypasses RLS, so this is a no-op for
-- current code paths, but closes the gap if a future route ever moves to a
-- user-scoped JWT client.
alter table tenant_audit_log enable row level security;
drop policy if exists "deny_all_tenant_audit_log" on tenant_audit_log;
create policy "deny_all_tenant_audit_log" on tenant_audit_log
  for all to public using (false) with check (false);
