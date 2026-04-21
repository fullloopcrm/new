-- Migration 026: Quotes + quote templates + quote activity log
-- Quoting + e-signature support for trades that quote before work
-- Flow: draft → sent → viewed → accepted/declined → converted to booking

-- ─── quotes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Identity
  quote_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'converted')),
  title TEXT,
  description TEXT,

  -- Contact snapshot (allows standalone quotes without a client_id)
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  service_address TEXT,

  -- Line items: [{ id, name, description, quantity, unit_price_cents, subtotal_cents, optional, selected }]
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Optional tiered pricing: { good: {label, total_cents, line_items}, better: {...}, best: {...} }
  tiers JSONB,
  accepted_tier TEXT,

  -- Money (all cents, bps for tax)
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_rate_bps INTEGER NOT NULL DEFAULT 0, -- 8875 = 8.875%
  tax_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,

  -- Terms
  terms TEXT,
  notes TEXT,
  valid_until DATE,

  -- Public accept URL token
  public_token TEXT UNIQUE,

  -- Send tracking
  sent_at TIMESTAMPTZ,
  sent_via TEXT,            -- 'email', 'sms', 'both'
  first_viewed_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,

  -- Decision
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  declined_reason TEXT,

  -- Signature (captured at accept)
  signature_png TEXT,          -- base64 data URL OR storage URL
  signature_name TEXT,
  signature_ip INET,
  signature_user_agent TEXT,

  -- Conversion
  converted_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,

  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_tenant_status ON quotes(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_client ON quotes(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_created ON quotes(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_public_token ON quotes(public_token) WHERE public_token IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_tenant_number ON quotes(tenant_id, quote_number);

-- updated_at trigger
CREATE OR REPLACE FUNCTION quotes_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quotes_updated_at ON quotes;
CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION quotes_set_updated_at();

-- ─── quote_templates ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quote_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  industry TEXT,
  title_template TEXT,
  description TEXT,

  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  tiers JSONB,

  terms TEXT,
  default_valid_days INTEGER NOT NULL DEFAULT 30,
  default_tax_rate_bps INTEGER NOT NULL DEFAULT 0,

  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_templates_tenant ON quote_templates(tenant_id, active);

-- ─── quote_activity (audit log + tracking) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quote_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL,
    -- 'created' | 'edited' | 'sent' | 'viewed' | 'accepted' | 'declined'
    -- | 'converted' | 'reminder_sent' | 'expired' | 'voided'
  detail JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_activity_quote ON quote_activity(quote_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_activity_tenant_type ON quote_activity(tenant_id, event_type);

-- ─── Quote numbering helper (per-tenant sequence, Q-YYYYMM-NNNN) ─────────────────────────────────────────────
-- Not a sequence (Postgres sequences are global) — compute at insert time via tenant-scoped count.
-- Consumers should set quote_number explicitly via app code using src/lib/quote-number.ts.
