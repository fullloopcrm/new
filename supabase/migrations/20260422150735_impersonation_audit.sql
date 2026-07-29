-- Adopted from legacy hand-run migration: 041_impersonation_audit.sql
-- Original commit date (git first-add): 2026-04-22T11:07:35-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- 041_impersonation_audit.sql
-- Audit trail for admin impersonation. Every request where fl_impersonate is active
-- gets one row written via tenant-query.ts. Needed so a compromised admin account
-- leaves evidence of which tenants' data it touched.

create table if not exists impersonation_events (
  id uuid primary key default gen_random_uuid(),
  actor_kind text not null check (actor_kind in ('pin_admin', 'clerk_super_admin')),
  actor_id text not null,
  tenant_id uuid not null references tenants(id) on delete cascade,
  path text,
  method text,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_impersonation_events_tenant_time
  on impersonation_events (tenant_id, created_at desc);

create index if not exists idx_impersonation_events_actor_time
  on impersonation_events (actor_id, created_at desc);

comment on table impersonation_events is
  'Append-only audit log: every API request made while fl_impersonate cookie is active.';
