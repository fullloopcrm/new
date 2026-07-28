-- Adopted from legacy hand-run migration: 024_tenant_members_clerk_optional.sql
-- Original commit date (git first-add): 2026-04-20T13:43:39-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- Migration 024: make clerk_user_id optional on tenant_members.
-- Reason: owner/admin rows can be seeded before the user has completed
-- Clerk signup (e.g. from an invite), AND fullloop supports PIN-based admin
-- auth as an alternative to Clerk. Requiring clerk_user_id NOT NULL blocks
-- the nycmaid owner seed.

ALTER TABLE tenant_members ALTER COLUMN clerk_user_id DROP NOT NULL;
