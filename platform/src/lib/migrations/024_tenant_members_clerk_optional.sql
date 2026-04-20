-- Migration 024: make clerk_user_id optional on tenant_members.
-- Reason: owner/admin rows can be seeded before the user has completed
-- Clerk signup (e.g. from an invite), AND fullloop supports PIN-based admin
-- auth as an alternative to Clerk. Requiring clerk_user_id NOT NULL blocks
-- the nycmaid owner seed.

ALTER TABLE tenant_members ALTER COLUMN clerk_user_id DROP NOT NULL;
