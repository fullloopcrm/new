-- 2026_07_17_tenant_domains_one_primary_per_tenant.sql
-- P1 schema lane (W1). Enforces the invariant every reader of tenant_domains
-- already assumes but nothing has ever guaranteed: AT MOST ONE
-- is_primary = true row per tenant.
--
-- ROOT BUG: POST /api/admin/websites (src/app/api/admin/websites/route.ts)
-- inserted a caller-supplied is_primary with zero check for an existing
-- primary on that tenant, and no DB constraint backed it either. Two admin
-- "Add domain" submissions with is_primary checked (or one resubmitted
-- request) leaves a tenant with 2+ "primary" domains. Every consumer of this
-- flag resolves it by picking an arbitrary match instead of erroring --
-- site-export's "resolve the tenant's primary public domain" does
-- `.find(d => d.is_primary) || domains[0]`, and 068's own is_primary->type
-- backfill mapping assumed the same 1:1 shape -- so the bug is silent,
-- nondeterministic data corruption (which domain counts as "the" website
-- flips depending on row order), not a crash. The route-level fix (clearing
-- any prior primary before insert) landed in the same commit as this file;
-- this migration is the DB-level backstop so the invariant holds even if a
-- future write path makes the same mistake.
--
-- DEDUPE-FIRST, same discipline as every other constraint added to this
-- table (055/056, 068/069): a partial unique index added directly against
-- live data that may already violate it would just fail to apply. Step 1
-- picks exactly one row to keep per tenant (prefer type='primary' since
-- that's what 068's backfill already derived from is_primary, then oldest
-- created_at, then lowest id for a fully deterministic tie-break) and clears
-- is_primary on the rest. Step 2 adds the index.
--
-- RUN ORDER: this is a single file (dedupe UPDATE, then CREATE UNIQUE INDEX)
-- -- unlike 068/069 there is no separate NOT NULL phase, since is_primary is
-- already NOT NULL DEFAULT false from 043 and a partial index only touches
-- rows where is_primary is true.

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY tenant_id
      ORDER BY (type = 'primary') DESC, created_at ASC, id ASC
    ) AS rn
  FROM tenant_domains
  WHERE is_primary = true
)
UPDATE tenant_domains td
SET is_primary = false
FROM ranked
WHERE td.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS tenant_domains_one_primary_per_tenant
  ON tenant_domains (tenant_id)
  WHERE is_primary = true;
