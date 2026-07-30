-- Tenant profile gap-fill (2026-07-30)
--
-- Adds the fields identified in the tenant-profile audit that had no home
-- yet: contract/lifecycle, internal account ownership, a secondary
-- contact, a payout-method preference (NOT raw bank numbers — see note
-- below), onboarding-link revocation, multi-location, and a structured
-- internal-notes log to replace the single overwritable `admin_notes`
-- column going forward (that column is left in place, unread by nothing,
-- just no longer the only place new notes can go).
--
-- Deliberately NOT included: raw bank account/routing numbers. Money
-- movement between FullLoop and a tenant already has a real mechanism
-- (`tenants.stripe_account_id`, Stripe Connect). Storing bank credentials
-- in a plain Postgres column with no vault behind it is a liability this
-- migration does not introduce — `payout_method` is a preference/label
-- only.
--
-- Idempotent: every statement is IF NOT EXISTS / safe to re-run.
-- No destructive ops. GATED — author only, do not apply without Jeff's
-- explicit go per THE PROCEDURE in docs/runbooks/migration-runbook.md.

-- ─── PRE (informational — confirm nothing here already exists) ─────────
DO $$
BEGIN
  RAISE NOTICE 'PRE tenant_profile_gaps: tenant_locations exists=%, tenant_notes exists=%, contract_signed_at exists=%',
    (SELECT to_regclass('public.tenant_locations') IS NOT NULL),
    (SELECT to_regclass('public.tenant_notes') IS NOT NULL),
    (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'contract_signed_at'));
END $$;

-- ─── Contract / lifecycle ───────────────────────────────────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contract_term_months integer;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- ─── Internal account ownership ─────────────────────────────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS account_owner text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS acquisition_channel text;

-- ─── Secondary contact ───────────────────────────────────────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS secondary_contact_name text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS secondary_contact_email text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS secondary_contact_phone text;

-- ─── Payout preference (label only — see header note) ───────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS payout_method text
  CHECK (payout_method IN ('stripe', 'check', 'other') OR payout_method IS NULL);

-- ─── Onboarding-link revocation ──────────────────────────────────────────
-- Bumping this invalidates every previously issued /onboard/<token> link
-- for this tenant (the token embeds the version it was signed with).
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_link_version integer NOT NULL DEFAULT 1;

-- ─── Multi-location ──────────────────────────────────────────────────────
-- Same shape/pattern as the existing `entities` table (034_entities.sql):
-- one tenant, N rows, one flagged primary.
CREATE TABLE IF NOT EXISTS tenant_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_locations_tenant ON tenant_locations(tenant_id, active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_locations_tenant_primary ON tenant_locations(tenant_id) WHERE is_primary = TRUE;

CREATE OR REPLACE FUNCTION tenant_locations_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_tenant_locations_updated_at ON tenant_locations;
CREATE TRIGGER trg_tenant_locations_updated_at BEFORE UPDATE ON tenant_locations
  FOR EACH ROW EXECUTE FUNCTION tenant_locations_updated_at();

ALTER TABLE tenant_locations ENABLE ROW LEVEL SECURITY;

-- Seed a default primary location per existing tenant from its current
-- address columns, mirroring how 034_entities.sql seeded a default entity.
-- Idempotent: only inserts where a tenant has no location row yet.
INSERT INTO tenant_locations (tenant_id, name, address, city, state, zip, phone, is_primary)
SELECT t.id, COALESCE(t.name, 'Main location'), t.address, NULL, NULL, t.zip_code, t.phone, TRUE
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM tenant_locations tl WHERE tl.tenant_id = t.id AND tl.is_primary);

-- ─── Structured internal notes (append-only log) ────────────────────────
-- Replaces `tenants.admin_notes` (single overwritable field, left in place
-- unread by nothing) as the place NEW internal notes go.
CREATE TABLE IF NOT EXISTS tenant_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  author TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_notes_tenant ON tenant_notes(tenant_id, created_at DESC);

ALTER TABLE tenant_notes ENABLE ROW LEVEL SECURITY;

-- ─── POST (assertion — must emit "POST OK", never raise) ────────────────
DO $$
BEGIN
  IF to_regclass('public.tenant_locations') IS NULL THEN
    RAISE EXCEPTION 'POST FAILED: tenant_locations table missing';
  END IF;
  IF to_regclass('public.tenant_notes') IS NULL THEN
    RAISE EXCEPTION 'POST FAILED: tenant_notes table missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'contract_signed_at') THEN
    RAISE EXCEPTION 'POST FAILED: tenants.contract_signed_at missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'onboarding_link_version') THEN
    RAISE EXCEPTION 'POST FAILED: tenants.onboarding_link_version missing';
  END IF;
  RAISE NOTICE 'tenant_profile_gaps POST OK';
END $$;

-- ─── ROLLBACK ────────────────────────────────────────────────────────────
-- The runbook asks for this to be added to deploy-prep/deploy-runbook.md's
-- ROLLBACK QUICK-REFERENCE table; that file does not exist in this
-- checkout, so the pointer lives here instead until that doc exists.
--   DROP TABLE IF EXISTS tenant_notes;
--   DROP TABLE IF EXISTS tenant_locations;
--   ALTER TABLE tenants DROP COLUMN IF EXISTS onboarding_link_version;
--   ALTER TABLE tenants DROP COLUMN IF EXISTS payout_method;
--   ALTER TABLE tenants DROP COLUMN IF EXISTS secondary_contact_phone;
--   ALTER TABLE tenants DROP COLUMN IF EXISTS secondary_contact_email;
--   ALTER TABLE tenants DROP COLUMN IF EXISTS secondary_contact_name;
--   ALTER TABLE tenants DROP COLUMN IF EXISTS acquisition_channel;
--   ALTER TABLE tenants DROP COLUMN IF EXISTS account_owner;
--   ALTER TABLE tenants DROP COLUMN IF EXISTS cancellation_reason;
--   ALTER TABLE tenants DROP COLUMN IF EXISTS cancelled_at;
--   ALTER TABLE tenants DROP COLUMN IF EXISTS trial_ends_at;
--   ALTER TABLE tenants DROP COLUMN IF EXISTS contract_term_months;
--   ALTER TABLE tenants DROP COLUMN IF EXISTS contract_signed_at;
