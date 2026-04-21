-- Migration 027: Invoices + invoice_activity + link payments to invoices.
-- Invoices live next to quotes/bookings. An invoice can be generated from a
-- quote (on accept/convert), from a completed booking, or standalone.

-- ─── invoices ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,

  invoice_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'void', 'refunded')),
  title TEXT,
  description TEXT,

  -- Contact snapshot (allows standalone invoices)
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  service_address TEXT,

  -- Line items: same shape as quotes line_items
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Money
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_rate_bps INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,

  -- Payment state (amount_paid_cents bumped by /api/invoices/[id]/mark-paid
  -- and by the payments trigger below)
  amount_paid_cents INTEGER NOT NULL DEFAULT 0,

  -- Terms
  terms TEXT,
  notes TEXT,
  due_date DATE,
  issued_at DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Public pay link
  public_token TEXT UNIQUE,

  -- Send tracking
  sent_at TIMESTAMPTZ,
  sent_via TEXT,
  first_viewed_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,

  paid_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,

  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_due ON invoices(tenant_id, due_date) WHERE status NOT IN ('paid', 'void', 'refunded');
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_client ON invoices(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_booking ON invoices(tenant_id, booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_public_token ON invoices(public_token) WHERE public_token IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_tenant_number ON invoices(tenant_id, invoice_number);

CREATE OR REPLACE FUNCTION invoices_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION invoices_set_updated_at();

-- ─── invoice_activity (audit + tracking) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL,
    -- 'created' | 'edited' | 'sent' | 'viewed' | 'partial_payment' | 'paid'
    -- | 'overdue' | 'refunded' | 'voided' | 'reminder_sent'
  detail JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_activity_invoice ON invoice_activity(invoice_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_activity_tenant_type ON invoice_activity(tenant_id, event_type);

-- ─── Link payments → invoices ─────────────────────────────────────────────
-- Payments already reference booking_id/client_id. Add invoice_id so
-- invoice payment state can aggregate from a single authoritative source.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id) WHERE invoice_id IS NOT NULL;

-- Trigger: when a payment is inserted/updated with a status of 'succeeded'/'paid'
-- and an invoice_id, recompute the invoice's amount_paid_cents + status.
CREATE OR REPLACE FUNCTION invoices_recompute_paid() RETURNS TRIGGER AS $$
DECLARE
  inv_id UUID;
  total_paid INTEGER;
  inv_total INTEGER;
  inv_status TEXT;
BEGIN
  inv_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  IF inv_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(SUM(amount_cents), 0)
    INTO total_paid
    FROM payments
    WHERE invoice_id = inv_id
      AND status IN ('succeeded', 'paid', 'completed');

  SELECT total_cents, status INTO inv_total, inv_status FROM invoices WHERE id = inv_id;
  IF inv_total IS NULL THEN RETURN NEW; END IF;

  UPDATE invoices
    SET amount_paid_cents = total_paid,
        status = CASE
          WHEN total_paid >= inv_total AND inv_status != 'void' AND inv_status != 'refunded' THEN 'paid'
          WHEN total_paid > 0 AND inv_status NOT IN ('paid','void','refunded') THEN 'partial'
          ELSE inv_status
        END,
        paid_at = CASE WHEN total_paid >= inv_total AND paid_at IS NULL THEN NOW() ELSE paid_at END
    WHERE id = inv_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payments_recompute_invoice ON payments;
CREATE TRIGGER trg_payments_recompute_invoice
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION invoices_recompute_paid();
