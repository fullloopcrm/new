-- Jefe integration-health sweep: latest per-tenant vendor check result.
-- One row per tenant, upserted on each sweep (no history — Jefe only needs
-- current state). Backs the `integrations` pillar in getPlatformHealth().
create table if not exists jefe_integration_health (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  tenant_name text not null,
  checks jsonb not null,
  failed jsonb not null default '[]'::jsonb,
  failed_count int not null default 0,
  checked_at timestamptz not null default now()
);

create index if not exists jefe_integration_health_failed_count_idx
  on jefe_integration_health (failed_count)
  where failed_count > 0;
