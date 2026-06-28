-- 052_client_properties.sql
-- Multi-address per client (ported from nycmaid 2026_06_21 + 2026_06_22),
-- adapted for FullLoop's multi-tenant model: every row carries tenant_id.
--
-- One client (person) can have many properties (addresses). Replaces the
-- implicit "one address per client" assumption so a returning client booking a
-- different address creates a new PROPERTY, not a duplicate client (which would
-- break phone-based SMS/contact routing).
--
-- Run in the FullLoop Supabase dashboard (local key is stale). Idempotent.

CREATE TABLE IF NOT EXISTS client_properties (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  label       text,                       -- optional nickname e.g. "Home", "Office"
  address     text NOT NULL,
  unit        text,
  latitude    double precision,
  longitude   double precision,
  is_primary  boolean NOT NULL DEFAULT false,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_properties_client_idx ON client_properties(client_id);
CREATE INDEX IF NOT EXISTS client_properties_tenant_idx ON client_properties(tenant_id);

-- Service-role only (matches deny-all RLS pattern; service role bypasses RLS).
ALTER TABLE client_properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_all_client_properties" ON client_properties;
CREATE POLICY "deny_all_client_properties" ON client_properties
  FOR ALL TO public USING (false) WITH CHECK (false);

-- Each booking points at the specific property it was for.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES client_properties(id);
CREATE INDEX IF NOT EXISTS bookings_property_idx ON bookings(property_id);

-- Preferred cleaner per client (also part of the nycmaid multi-address batch).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS preferred_cleaner_id uuid;

-- Backfill: one primary property per client that has an address (idempotent).
-- tenant_id comes from the client row so each property stays tenant-scoped.
INSERT INTO client_properties (tenant_id, client_id, address, latitude, longitude, is_primary, active)
SELECT c.tenant_id, c.id, c.address, c.latitude, c.longitude, true, true
FROM clients c
WHERE c.address IS NOT NULL
  AND btrim(c.address) <> ''
  AND NOT EXISTS (SELECT 1 FROM client_properties cp WHERE cp.client_id = c.id);

-- Point existing bookings at their client's primary property.
UPDATE bookings b
SET property_id = cp.id
FROM client_properties cp
WHERE cp.client_id = b.client_id
  AND cp.is_primary = true
  AND b.property_id IS NULL;

-- Audit log for every address add/edit/switch (portal, admin, booking, agent).
CREATE TABLE IF NOT EXISTS property_changes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  property_id uuid REFERENCES client_properties(id) ON DELETE SET NULL,
  action      text NOT NULL,            -- 'add' | 'edit' | 'set_primary' | 'deactivate' | 'reactivate'
  old_value   jsonb,
  new_value   jsonb,
  changed_by  text,                     -- 'client' | 'admin' | 'agent' | 'system'
  actor_id    text,                     -- client_id / admin email / agent name
  source      text,                     -- 'portal' | 'admin' | 'booking' | 'api'
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS property_changes_client_idx ON property_changes(client_id);
CREATE INDEX IF NOT EXISTS property_changes_property_idx ON property_changes(property_id);
CREATE INDEX IF NOT EXISTS property_changes_tenant_idx ON property_changes(tenant_id);

ALTER TABLE property_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_all_property_changes" ON property_changes;
CREATE POLICY "deny_all_property_changes" ON property_changes
  FOR ALL TO public USING (false) WITH CHECK (false);
