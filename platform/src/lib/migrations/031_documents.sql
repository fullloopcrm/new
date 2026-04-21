-- Migration 031: Documents — general-purpose PDF e-signing with multi-party,
-- ESIGN-compliant consent, SHA-256 integrity, drag-drop fields.

-- ─── documents ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  message TEXT,                           -- Message sent with signer invites
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'in_progress', 'completed', 'declined', 'voided', 'expired')),
  sign_order TEXT NOT NULL DEFAULT 'parallel'
    CHECK (sign_order IN ('parallel', 'sequential')),

  -- Storage refs (Supabase Storage bucket = 'documents')
  original_path TEXT NOT NULL,             -- tenants/{tenant_id}/docs/{doc_id}/original.pdf
  signed_path TEXT,                        -- ...final.pdf (flattened w/ sigs + cert)
  page_count INTEGER,

  -- Integrity
  original_sha256 TEXT,                    -- Computed at SEND time. Locks the bytes.
  signed_sha256 TEXT,                      -- Of the flattened PDF

  -- ESIGN consent (platform default v1; tenant-customizable v1.1)
  consent_text TEXT NOT NULL DEFAULT
    'I agree to sign electronically. I understand my electronic signature carries the same legal effect as a handwritten signature under the ESIGN Act and UETA.',

  -- Lifecycle
  expires_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  voided_from UUID REFERENCES documents(id) ON DELETE SET NULL,  -- For "duplicate & void" flow

  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant_status ON documents(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_created ON documents(tenant_id, created_at DESC);

CREATE OR REPLACE FUNCTION documents_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_documents_updated_at ON documents;
CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION documents_updated_at();

-- ─── document_signers ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  order_index INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,                               -- "Primary", "Co-owner", "Spouse", etc.

  public_token TEXT UNIQUE NOT NULL,       -- Per-signer URL
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'viewed', 'signed', 'declined')),

  -- Tracking
  sent_at TIMESTAMPTZ,
  first_viewed_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_reminded_at TIMESTAMPTZ,            -- For future reminder cron

  -- ESIGN consent audit
  consent_accepted_at TIMESTAMPTZ,
  consent_ip INET,
  consent_user_agent TEXT,

  -- Signing audit
  signed_at TIMESTAMPTZ,
  signed_ip INET,
  signed_user_agent TEXT,
  signature_png TEXT,                      -- base64 data URL of primary signature
  signature_name TEXT,                     -- typed name

  declined_at TIMESTAMPTZ,
  decline_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_signers_doc ON document_signers(document_id, order_index);
CREATE INDEX IF NOT EXISTS idx_document_signers_tenant ON document_signers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_signers_token ON document_signers(public_token);

DROP TRIGGER IF EXISTS trg_document_signers_updated_at ON document_signers;
CREATE TRIGGER trg_document_signers_updated_at
  BEFORE UPDATE ON document_signers
  FOR EACH ROW EXECUTE FUNCTION documents_updated_at();

-- ─── document_fields ─────────────────────────────────────────────
-- Field placement on the PDF. Coordinates as percentages so they
-- survive any display resize. 0-100 x/y/w/h.
CREATE TABLE IF NOT EXISTS document_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  signer_id UUID NOT NULL REFERENCES document_signers(id) ON DELETE CASCADE,

  type TEXT NOT NULL
    CHECK (type IN ('signature', 'initial', 'date', 'text', 'full_name')),
  page INTEGER NOT NULL DEFAULT 1,

  -- Position as percentage of page dimensions (0-100)
  x_pct NUMERIC(6,3) NOT NULL,
  y_pct NUMERIC(6,3) NOT NULL,
  w_pct NUMERIC(6,3) NOT NULL DEFAULT 20,
  h_pct NUMERIC(6,3) NOT NULL DEFAULT 4,

  required BOOLEAN NOT NULL DEFAULT TRUE,
  label TEXT,

  -- Captured value (text, date ISO, signature data URL)
  value TEXT,
  filled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_fields_doc ON document_fields(document_id, page);
CREATE INDEX IF NOT EXISTS idx_document_fields_signer ON document_fields(signer_id);

DROP TRIGGER IF EXISTS trg_document_fields_updated_at ON document_fields;
CREATE TRIGGER trg_document_fields_updated_at
  BEFORE UPDATE ON document_fields
  FOR EACH ROW EXECUTE FUNCTION documents_updated_at();

-- ─── document_activity (audit log) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES document_signers(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
    -- 'created' | 'uploaded' | 'field_placed' | 'sent' | 'viewed'
    -- | 'consent_accepted' | 'signed' | 'completed' | 'declined' | 'voided'
    -- | 'reminder_sent' | 'expired'
  detail JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_activity_doc ON document_activity(document_id, created_at DESC);

-- ─── Storage bucket ─────────────────────────────────────────────
-- The 'documents' bucket must be created via Supabase Storage API / dashboard.
-- Bucket policy: authenticated read + service_role write. Per-tenant prefix
-- enforced in code.
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', FALSE)
ON CONFLICT (id) DO NOTHING;
