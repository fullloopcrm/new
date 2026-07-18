-- 2026_07_18_set_primary_client_property.sql
-- P1 schema lane (W1). Atomic single-statement replacement for the "demote
-- others, then set/insert the new primary" two-step client_properties.is_primary
-- write used by setPrimaryProperty() and resolveProperty() (src/lib/client-properties.ts).
--
-- Same race, same fix shape as set_primary_client_contact
-- (2026_07_16_set_primary_client_contact.sql): two concurrent "set as primary"
-- calls for two DIFFERENT properties under the same client (e.g.
-- PATCH /api/client/properties action=set_primary fired twice, or two
-- concurrent bookings both resolving a brand-new client's first-ever address)
-- can each independently run their own demote-then-write step and interleave
-- into either TWO primaries (demote-then-write ordering) or ZERO primaries
-- (each call's demote step stomps the other's just-set row) -- neither
-- ordering of two separate statements closes it. A single UPDATE is atomic in
-- Postgres (one snapshot, serialized by row locks), so there is no window for
-- a second concurrent call to observe or interleave with a partial state --
-- every call deterministically leaves exactly one property primary for that
-- client (whichever call commits last wins, not zero and not two).
--
-- File-only, not applied. Needs Jeff's approval + the leader to run it before
-- the corresponding code fix (which calls this RPC) is live.
CREATE OR REPLACE FUNCTION set_primary_client_property(
  p_tenant_id uuid,
  p_client_id uuid,
  p_property_id uuid
) RETURNS void AS $$
BEGIN
  UPDATE client_properties
  SET is_primary = (id = p_property_id)
  WHERE tenant_id = p_tenant_id AND client_id = p_client_id;
END;
$$ LANGUAGE plpgsql;
