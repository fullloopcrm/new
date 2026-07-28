-- Adopted from legacy hand-run migration: 025_tenant_ai_seo_keys.sql
-- Original commit date (git first-add): 2026-04-20T14:08:18-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- Migration 025: per-tenant Anthropic + IndexNow keys.
-- Admin onboarding UI accepts these so new tenants can use their own API keys
-- or leave blank to use platform-level fallback.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS anthropic_api_key TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS indexnow_key TEXT;
