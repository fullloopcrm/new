-- Billing address on prospects, matching partner_requests. The /qualify form
-- already collects this; it was only ever folded into a best-effort copy on
-- partner_requests, never saved on the prospects row itself — so the real
-- prospects -> tenant path (wire-received) had no billing address to read.
-- Idempotent: safe to re-run.
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS billing_city    TEXT,
  ADD COLUMN IF NOT EXISTS billing_state   TEXT,
  ADD COLUMN IF NOT EXISTS billing_zip     TEXT;
