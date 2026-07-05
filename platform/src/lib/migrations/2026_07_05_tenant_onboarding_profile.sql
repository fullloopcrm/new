-- Onboarding profile wizard: compliance block (license + insurance, trade-varying →
-- jsonb) and a resumable draft store so the tenant can save-and-return.
-- Applied to prod via the Supabase Management API on 2026-07-05.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS compliance jsonb DEFAULT '{}'::jsonb;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_draft jsonb;
