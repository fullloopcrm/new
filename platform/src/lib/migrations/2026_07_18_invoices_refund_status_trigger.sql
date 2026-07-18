-- 2026_07_18_invoices_refund_status_trigger.sql
-- FILE ONLY -- do NOT execute here. Leader runs after Jeff approves.
--
-- WHY: invoices.status has 'refunded' in its own CHECK constraint (027_invoices.sql
-- line 15) but the trigger that recomputes it (invoices_recompute_paid, same file)
-- can never actually write it. Its CASE only ever produces 'paid' or 'partial' (or
-- leaves the status unchanged); once an invoice reached 'paid' the CASE's own guards
-- (`inv_status != 'paid'`) block the 'partial' branch from ever re-firing, so if a
-- payment linked to that invoice is later refunded -- total_paid drops below
-- inv_total, sometimes to zero -- the invoice silently stays 'paid' forever. Same
-- "declared status, zero writer" shape as the go-live checklist 'blocked' status
-- fixed earlier this session (0a3dabde), on the money-accuracy rail instead of
-- onboarding: AR aging, the client-facing invoice page, and any admin view reading
-- invoices.status/amount_paid_cents all keep reporting an invoice as paid in full
-- after the client was actually refunded.
--
-- FIX: recompute status from the current total_paid every time, with 'void' and
-- 'refunded' treated as terminal (matches the CASE's original intent -- once
-- voided/refunded, a stray/late payment row should not silently reopen it):
--   total_paid >= inv_total  -> 'paid'                          (unchanged case)
--   0 < total_paid < inv_total, coming from 'paid'/'partial'    -> 'partial' (now
--     reachable from 'paid', where it previously was not)
--   total_paid <= 0, coming from 'paid'/'partial'               -> 'refunded' (new
--     -- the actual gap: a fully-refunded invoice now gets the status its own
--     schema always allowed)
--   otherwise (draft/sent/viewed/overdue with no payment yet)   -> unchanged
--
-- No backfill: this only changes future trigger firings (any payment insert/update/
-- delete against an invoice-linked row). Existing invoices stuck 'paid' after a past
-- refund are a data-cleanup question for the leader/Jeff, not something a schema
-- migration should silently rewrite.

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
          WHEN inv_status IN ('void', 'refunded') THEN inv_status
          WHEN total_paid >= inv_total AND inv_total > 0 THEN 'paid'
          WHEN total_paid > 0 THEN 'partial'
          WHEN total_paid <= 0 AND inv_status IN ('paid', 'partial') THEN 'refunded'
          ELSE inv_status
        END,
        paid_at = CASE WHEN total_paid >= inv_total AND inv_total > 0 AND paid_at IS NULL THEN NOW() ELSE paid_at END
    WHERE id = inv_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
