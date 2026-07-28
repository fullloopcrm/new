-- Adopted from legacy hand-run migration: 2026_07_05_tenant_onboarding_profile.sql
-- Original commit date (git first-add): 2026-07-05T11:37:48-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- Onboarding profile wizard: compliance block (license + insurance, trade-varying →
-- jsonb) and a resumable draft store so the tenant can save-and-return.
-- Applied to prod via the Supabase Management API on 2026-07-05.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS compliance jsonb DEFAULT '{}'::jsonb;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_draft jsonb;
