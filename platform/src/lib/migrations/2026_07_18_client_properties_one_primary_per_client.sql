-- 2026_07_18_client_properties_one_primary_per_client.sql
-- P1 schema lane (W1). DB-level backstop enforcing the invariant every reader
-- of client_properties already assumes but nothing has ever guaranteed: AT
-- MOST ONE is_primary = true row per client. Same discipline as
-- 2026_07_17_tenant_domains_one_primary_per_tenant.sql -- the code-level fix
-- (set_primary_client_property RPC, called from setPrimaryProperty() and
-- resolveProperty()) closes the race going forward; this is the backstop so
-- the invariant holds even if a future write path makes the same two-step
-- mistake again.
--
-- DEDUPE-FIRST, same discipline as every other constraint added in this
-- session: a partial unique index added directly against live data that may
-- already violate it would just fail to apply. Step 1 picks exactly one row
-- to keep per client (oldest created_at, then lowest id for a fully
-- deterministic tie-break -- client_properties has no `type` column to prefer
-- like tenant_domains did) and clears is_primary on the rest. Step 2 adds the
-- index.
--
-- File-only, not applied. Needs Jeff's approval + the leader to run it.

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY client_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM client_properties
  WHERE is_primary = true
)
UPDATE client_properties cp
SET is_primary = false
FROM ranked
WHERE cp.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS client_properties_one_primary_per_client
  ON client_properties (client_id)
  WHERE is_primary = true;
