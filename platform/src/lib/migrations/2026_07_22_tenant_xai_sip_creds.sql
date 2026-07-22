-- Per-tenant xAI SIP digest credentials for handing an inbound customer call
-- off to the tenant's xAI Grok voice agent (Yinez on the phone) via a Telnyx
-- Call Control `transfer` to sip:<number>@sip.voice.x.ai. Global columns,
-- NULL for every tenant until set — presence of BOTH is what enables the
-- voice-agent hand-off for that tenant, no separate feature flag needed.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS xai_sip_username text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS xai_sip_password text;
