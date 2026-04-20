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
