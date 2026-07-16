-- Atomic single-statement replacement for the "demote others, then set/insert
-- the new primary" two-step client_contacts.is_primary write used by
-- POST /api/clients/[id]/contacts and PUT /api/clients/[id]/contacts/[contactId].
--
-- The two-step version (in either order) has a real race: two concurrent
-- "set as primary" requests for two DIFFERENT contacts under the same client
-- can interleave as insert/update-A, insert/update-B, demote-A (demotes B),
-- demote-B (demotes A) -- landing ZERO primary contacts, not one, no matter
-- which order the two steps run in. A single UPDATE statement is atomic in
-- Postgres (one snapshot, serialized by row locks), so there is no window
-- for a second concurrent call to observe or interleave with a partial
-- state -- every call always leaves exactly one contact primary for that
-- client (whichever call commits last wins, deterministically, not zero and
-- not two).
--
-- File-only, not applied. Needs Jeff's approval + the leader to run it
-- before the corresponding route fix (which calls this RPC) is live.
CREATE OR REPLACE FUNCTION set_primary_client_contact(
  p_tenant_id uuid,
  p_client_id uuid,
  p_contact_id uuid
) RETURNS void AS $$
BEGIN
  UPDATE client_contacts
  SET is_primary = (id = p_contact_id)
  WHERE tenant_id = p_tenant_id AND client_id = p_client_id;
END;
$$ LANGUAGE plpgsql;
