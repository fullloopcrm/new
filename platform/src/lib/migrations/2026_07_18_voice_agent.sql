-- Voice AI agent (Yinez/Selena answers the phone) — per-tenant config (2026-07-18)
-- Ported from nycmaid's single-tenant xAI Grok voice-agent feature
-- (commits f02c3fe4, b0d665cf, b9a87f1b, d95d9d0d, 55d4ef65, fb5d382f,
-- 61a97d0d, 25c162bf, 4fd2fb64, 36448bc3), adapted so every tenant can
-- configure its own xAI SIP agent + MCP secret instead of the single
-- hardcoded env vars nycmaid used.
--
-- voice_mcp_token: opaque secret used two ways: (1) as the URL-path secret
-- xAI's Custom MCP connector hits (/api/voice/mcp/<token>/mcp — xAI's
-- connector only supports OAuth-or-none, not a static Bearer header, so the
-- secret has to live in the path, same as nycmaid's b9a87f1b), and (2) as
-- the URL-path secret on the Telnyx call-lifecycle webhook
-- (/api/webhook/telnyx-voice-agent/<token>). Unique so a secret can resolve
-- back to exactly one tenant.
--
-- voice_agent_enabled: flag gate for SIP-routing inbound calls to the xAI
-- agent (25c162bf's VOICE_AGENT_ENABLED, now per-tenant). Defaults false —
-- landing this migration is a no-op until a tenant opts in.
--
-- xai_sip_username / xai_sip_password: digest-auth credentials for the
-- Telnyx->xAI SIP transfer (25c162bf's XAI_SIP_USERNAME/XAI_SIP_PASSWORD).
-- Password stored encrypted via lib/secret-crypto.ts, same convention as
-- tenants.telnyx_api_key.
--
-- Idempotent: safe to re-run. NOT applied to prod — file only, per leader
-- instruction; leader runs this after Jeff approves.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS voice_mcp_token text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS voice_agent_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS xai_sip_username text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS xai_sip_password text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_voice_mcp_token
  ON tenants(voice_mcp_token) WHERE voice_mcp_token IS NOT NULL;
