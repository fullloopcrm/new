-- ============================================================
-- HEAD/SUB-TENANT HIERARCHY — tenants.parent_tenant_id
-- ============================================================
-- Foundation only: lets any tenant be the "head" for one or more sub-tenants
-- (multi-location / franchise units are the same primitive underneath). NULL
-- = standalone (every existing tenant today, unaffected). No depth cap — a
-- sub-tenant can itself be a head later.
--
-- Deliberately NOT part of this migration (future work, not foundation):
--   - billing coupling/rollup across parent+children — every tenant keeps
--     its own independent billing_status/monthly_rate/stripe_account_id
--   - brand auto-sync after the initial clone-on-provision seed
--   - external/licensee provisioning API
-- ============================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS parent_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

-- The one cycle a plain CHECK constraint can actually catch (a tenant
-- pointing at itself). Deeper cycles (A -> B -> C -> A) can't be expressed as
-- a CHECK — those are guarded at the application layer by wouldCreateCycle()
-- in src/lib/create-sub-tenant.ts, run against any write that changes an
-- EXISTING tenant's parent_tenant_id. Brand-new tenant creation can never
-- produce a cycle (a not-yet-existing id can't already be its own ancestor),
-- so the app-level guard only matters for future re-parenting, not creation.
ALTER TABLE tenants
  ADD CONSTRAINT tenants_parent_not_self CHECK (parent_tenant_id IS NULL OR parent_tenant_id <> id);

CREATE INDEX IF NOT EXISTS tenants_parent_tenant_id_idx ON tenants (parent_tenant_id);

-- ------------------------------------------------------------
-- Widen the impersonation audit log's actor_kind check (041_impersonation_
-- audit.sql) to admit the new head-tenant-viewing-a-descendant actor kind.
-- Without this, tenant-query.ts's audit insert for that path silently no-ops
-- (best-effort insert, see logImpersonationEvent) — this feature's cross-
-- tenant access reads would go unaudited otherwise.
-- ------------------------------------------------------------
ALTER TABLE impersonation_events DROP CONSTRAINT IF EXISTS impersonation_events_actor_kind_check;
ALTER TABLE impersonation_events
  ADD CONSTRAINT impersonation_events_actor_kind_check
  CHECK (actor_kind IN ('pin_admin', 'clerk_super_admin', 'head_tenant'));
