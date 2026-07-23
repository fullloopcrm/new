-- 2026_07_23_client_property_phone_comms.sql
-- Per-address phone number + communication preferences on client_properties.
--
-- client_properties already covers multi-address (052_client_properties.sql).
-- This adds a phone per property (a client may have a different reachable
-- number at a second home / office address) and per-address comms toggles —
-- e.g. a property manager's address that should only ever get email, never
-- SMS/calls. Defaults preserve today's behavior (every channel enabled).
--
-- PREPARED, NOT RUN. Run in the FullLoop Supabase dashboard (local key is
-- stale) after Jeff/leader sign-off. Idempotent — safe to run more than once.

ALTER TABLE client_properties ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE client_properties ADD COLUMN IF NOT EXISTS sms_ok boolean NOT NULL DEFAULT true;
ALTER TABLE client_properties ADD COLUMN IF NOT EXISTS email_ok boolean NOT NULL DEFAULT true;
ALTER TABLE client_properties ADD COLUMN IF NOT EXISTS call_ok boolean NOT NULL DEFAULT true;
