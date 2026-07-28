-- Adopted from legacy hand-run migration: 2026_07_22_tenant_xai_sip_creds.sql
-- Original commit date (git first-add): 2026-07-22T19:15:17-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- Per-tenant xAI SIP digest credentials for handing an inbound customer call
-- off to the tenant's xAI Grok voice agent (Yinez on the phone) via a Telnyx
-- Call Control `transfer` to sip:<number>@sip.voice.x.ai. Global columns,
-- NULL for every tenant until set — presence of BOTH is what enables the
-- voice-agent hand-off for that tenant, no separate feature flag needed.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS xai_sip_username text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS xai_sip_password text;
