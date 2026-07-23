-- Separate, optional voice-only DID for tenants whose inbound call number
-- differs from tenants.telnyx_phone (SMS "from" address, used across ~50
-- call sites — never repurpose it). resolveVoiceTenant() in
-- webhooks/telnyx-voice/route.ts matches either column. NULL for every
-- tenant that answers calls on the same number they text from.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS voice_did text;
