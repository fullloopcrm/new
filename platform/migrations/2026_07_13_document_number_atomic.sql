-- Invoice/quote numbering: close a duplicate-number TOCTOU race.
--
-- generateInvoiceNumber()/generateQuoteNumber() (src/lib/invoice.ts,
-- src/lib/quote.ts) derived NNNN by SELECT COUNT(*) of the tenant's
-- documents created so far this month, then appended `count + 1`. Two admins
-- (or a double-submit) creating two invoices/quotes for the same tenant in
-- the same month, close together, can both run the count query before
-- either INSERT lands — both compute the same count and both documents get
-- the SAME invoice/quote number. There is no unique constraint on the number
-- column, so this silently persists two documents with an identical number
-- (an accounting/compliance defect: duplicate invoice numbers sent to two
-- different clients).
--
-- Fix: a dedicated per-tenant-per-period atomic counter. INSERT ... ON
-- CONFLICT DO UPDATE against a UNIQUE(tenant_id, doc_type, period) row
-- serializes concurrent callers on that row's lock, so each call gets a
-- distinct, monotonically-increasing sequence number — no two callers can
-- ever read-and-reuse the same count.
CREATE TABLE IF NOT EXISTS public.document_number_counters (
  tenant_id uuid NOT NULL,
  doc_type text NOT NULL,   -- 'invoice' | 'quote'
  period text NOT NULL,     -- 'YYYYMM'
  last_seq int NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, doc_type, period)
);

CREATE OR REPLACE FUNCTION public.next_document_number(
  p_tenant_id uuid,
  p_doc_type text,
  p_period text
) RETURNS int
LANGUAGE plpgsql AS $$
DECLARE
  v_seq int;
BEGIN
  INSERT INTO public.document_number_counters (tenant_id, doc_type, period, last_seq)
  VALUES (p_tenant_id, p_doc_type, p_period, 1)
  ON CONFLICT (tenant_id, doc_type, period)
  DO UPDATE SET last_seq = public.document_number_counters.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN v_seq;
END;
$$;
