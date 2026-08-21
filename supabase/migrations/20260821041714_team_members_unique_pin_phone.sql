-- team_members currently allows duplicate PINs and duplicate phone numbers
-- within the same tenant — two team members could share a login PIN, or the
-- same phone could be attached to two member rows, with no DB-level guard.
-- Verified against the live DB before writing this (66 rows total across all
-- tenants, zero (tenant_id, pin) or (tenant_id, phone) collisions), so this
-- is safe to apply as a plain unique index — no backfill/dedupe step needed.
--
-- Partial (WHERE ... IS NOT NULL) so multiple members can still have a NULL
-- pin or NULL phone without colliding — NULL already doesn't equal NULL
-- under a plain UNIQUE constraint, but being explicit here matches the
-- existing house style (see supabase/migrations/*_comhub.sql) and makes the
-- intent obvious without relying on that behavior.

CREATE UNIQUE INDEX IF NOT EXISTS uniq_team_members_tenant_pin
  ON team_members(tenant_id, pin)
  WHERE pin IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_team_members_tenant_phone
  ON team_members(tenant_id, phone)
  WHERE phone IS NOT NULL;
