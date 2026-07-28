-- Adopted from legacy hand-run migration: 022_domain_notes_unique.sql
-- Original commit date (git first-add): 2026-04-20T13:27:45-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- Migration 022: uniqueness on domain_notes(tenant_id, domain) + column alias.
-- Nycmaid stores per-(tenant,domain) free-form notes. /api/domain-notes
-- upserts on (tenant_id, domain); without the unique index, upsert fails.

-- Column was named `note`; nycmaid's API uses `notes`. Rename idempotent.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'domain_notes' AND column_name = 'note'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'domain_notes' AND column_name = 'notes'
  ) THEN
    ALTER TABLE domain_notes RENAME COLUMN note TO notes;
  END IF;
END $$;

-- Relax NOT NULL on notes — empty string is allowed.
ALTER TABLE domain_notes ALTER COLUMN notes DROP NOT NULL;

-- Unique per (tenant, domain).
CREATE UNIQUE INDEX IF NOT EXISTS idx_domain_notes_tenant_domain_unique
  ON domain_notes(tenant_id, domain);
