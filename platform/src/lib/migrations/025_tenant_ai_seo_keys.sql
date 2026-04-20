-- Migration 025: per-tenant Anthropic + IndexNow keys.
-- Admin onboarding UI accepts these so new tenants can use their own API keys
-- or leave blank to use platform-level fallback.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS anthropic_api_key TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS indexnow_key TEXT;
