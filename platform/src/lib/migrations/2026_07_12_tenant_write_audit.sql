-- 2026_07_12_tenant_write_audit.sql
-- P9: audit-logging expansion.
--
-- Generalizes the impersonation_events pattern (041_impersonation_audit.sql) from
-- "log every request made under an active impersonation cookie" to "log every
-- tenant-WRITE action, regardless of actor." impersonation_events answers *who
-- touched a tenant while impersonating*; this table answers *who changed what,
-- and how* — for owners, members, PIN admins, super admins, and the Jefe agent
-- alike.
--
-- Append-only. Written best-effort by src/lib/audit-log.ts (logTenantWrite);
-- an audit-insert failure must never block the underlying mutation.
--
-- FILE ONLY — not executed. The leader applies this DDL after Jeff approves.
-- No auto-migration runner globs this directory (verified 2026-07-12); apply manually.

create table if not exists tenant_write_events (
  id uuid primary key default gen_random_uuid(),

  tenant_id uuid not null references tenants(id) on delete cascade,

  -- Who performed the write.
  --   owner              — Clerk-authenticated tenant owner
  --   member             — per-tenant member (tenant_members.role)
  --   pin_admin          — global PIN super-admin (admin_token)
  --   clerk_super_admin  — Clerk super admin acting via impersonation
  --   jefe               — the Jefe agent acting on the tenant's behalf
  --   system             — background job / cron / webhook handler
  actor_kind text not null check (actor_kind in
    ('owner', 'member', 'pin_admin', 'clerk_super_admin', 'jefe', 'system')),
  actor_id text not null,

  -- Dot-namespaced verb: '<resource>.<verb>', e.g. 'job.create',
  -- 'customer.update', 'invoice.void', 'settings.update'. See the taxonomy in
  -- platform/docs/design/audit-logging-expansion.md.
  action text not null,

  -- Affected resource. resource_id is text (not uuid) because some resources are
  -- keyed by slug or composite id.
  resource_type text,
  resource_id text,

  -- True when the write happened while an fl_impersonate cookie was active, i.e.
  -- this row also has (or should have) a sibling in impersonation_events.
  via_impersonation boolean not null default false,

  -- Request provenance, mirrors impersonation_events.
  path text,
  method text,
  ip inet,
  user_agent text,

  -- Free-form context: field-level diffs, before/after snippets, request ids.
  meta jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_tenant_write_events_tenant_time
  on tenant_write_events (tenant_id, created_at desc);

create index if not exists idx_tenant_write_events_actor_time
  on tenant_write_events (actor_id, created_at desc);

create index if not exists idx_tenant_write_events_action_time
  on tenant_write_events (action, created_at desc);

-- Deny-by-default: only the service role (supabaseAdmin) reads or writes this
-- table. No policy is created, so with RLS enabled all anon/authenticated access
-- is denied — consistent with 046_rls_deny_on_new_tables.sql. Admin surfaces read
-- it through the service-role client, never directly from the browser.
alter table tenant_write_events enable row level security;

comment on table tenant_write_events is
  'Append-only audit log: every tenant-write action (any actor). Generalizes impersonation_events. Service-role access only.';
