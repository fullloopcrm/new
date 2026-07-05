-- Migration 053: HR foundation
-- The connective people-layer that ties team_members + payroll + onboarding +
-- documents into one HR system. Global (one codebase); tenants differ by DATA.
-- Additive only — nothing dropped. Every table carries tenant_id and is keyed
-- to the existing team_members row (HR does not duplicate the worker record;
-- it augments it 1:1 and hangs docs/notes off it).

-- ---------------------------------------------------------------------------
-- 1. hr_employee_profiles — 1:1 augmentation of team_members with HR/comp data.
--    employment_type is the fork every downstream tax/doc/payroll rule keys on.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr_employee_profiles (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_member_id          UUID NOT NULL UNIQUE REFERENCES team_members(id) ON DELETE CASCADE,
  employment_type         TEXT NOT NULL DEFAULT 'contractor_1099'
                            CHECK (employment_type IN ('contractor_1099', 'employee_w2')),
  hr_status               TEXT NOT NULL DEFAULT 'active'
                            CHECK (hr_status IN ('active', 'on_leave', 'terminated')),
  hire_date               DATE,
  termination_date        DATE,
  title                   TEXT,
  department              TEXT,
  -- Comp: canonical HR pay definition. team_members.hourly_rate/pay_rate stay as
  -- the scheduling/job-costing rate; this is the HR-of-record rate + cadence.
  comp_type               TEXT NOT NULL DEFAULT 'per_job'
                            CHECK (comp_type IN ('per_job', 'hourly', 'salary')),
  pay_rate_cents          INTEGER,
  pay_period              TEXT NOT NULL DEFAULT 'per_job'
                            CHECK (pay_period IN ('per_job', 'weekly', 'biweekly', 'semimonthly', 'monthly')),
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  date_of_birth           DATE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hr_profiles_tenant ON hr_employee_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_profiles_member ON hr_employee_profiles(team_member_id);
ALTER TABLE hr_employee_profiles ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. hr_document_requirements — per-tenant template of which docs are required.
--    THIS is where trades differ: a tow tenant adds CDL, pest adds an applicator
--    license — all as data rows, never new code. applies_to scopes a doc to an
--    employment type (e.g. W-9 for 1099, W-4/I-9 for W-2, 'all' for both).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr_document_requirements (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  doc_type     TEXT NOT NULL,
  label        TEXT NOT NULL,
  applies_to   TEXT NOT NULL DEFAULT 'all'
                 CHECK (applies_to IN ('all', 'contractor_1099', 'employee_w2')),
  required     BOOLEAN NOT NULL DEFAULT TRUE,
  has_expiry   BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, doc_type)
);
CREATE INDEX IF NOT EXISTS idx_hr_doc_reqs_tenant ON hr_document_requirements(tenant_id);
ALTER TABLE hr_document_requirements ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. hr_documents — actual per-employee document records + expiry tracking.
--    expires_on drives the compliance nudges (license/insurance about to lapse).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr_documents (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  doc_type       TEXT NOT NULL,
  label          TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'expired')),
  file_url       TEXT,
  issued_on      DATE,
  expires_on     DATE,
  reviewed_by    UUID,
  reviewed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hr_docs_tenant ON hr_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_docs_member ON hr_documents(team_member_id);
CREATE INDEX IF NOT EXISTS idx_hr_docs_expiry ON hr_documents(tenant_id, expires_on)
  WHERE expires_on IS NOT NULL;
ALTER TABLE hr_documents ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. hr_notes — per-employee log (note / write-up / kudos / review).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr_notes (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  author_id      UUID,
  author_name    TEXT,
  kind           TEXT NOT NULL DEFAULT 'note'
                   CHECK (kind IN ('note', 'writeup', 'kudos', 'review')),
  body           TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hr_notes_member ON hr_notes(team_member_id, created_at DESC);
ALTER TABLE hr_notes ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5. hr_document_reminders — one row per (document, milestone) reminder that was
--    actually sent, making the auto-nudge engine idempotent by construction:
--    it sends a given milestone nudge only when no row for it exists yet.
--    milestone examples: 'expiry_30d','expiry_14d','expiry_7d','expiry_1d','missing'.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr_document_reminders (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_id  UUID NOT NULL REFERENCES hr_documents(id) ON DELETE CASCADE,
  milestone    TEXT NOT NULL,
  channel      TEXT CHECK (channel IN ('email', 'sms', 'in_app')),
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, milestone)
);
CREATE INDEX IF NOT EXISTS idx_hr_doc_reminders_tenant ON hr_document_reminders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_doc_reminders_doc ON hr_document_reminders(document_id);
ALTER TABLE hr_document_reminders ENABLE ROW LEVEL SECURITY;
