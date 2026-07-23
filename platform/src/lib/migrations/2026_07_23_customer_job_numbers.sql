-- Customer IDs + job numbers (2026-07-23)
--
-- customer_number: per-tenant sequential id on clients (1, 2, 3...). Two
-- different tenants can both have a "customer #1" — the sequence resets
-- per tenant_id, it is NOT platform-global.
--
-- job_seq: per-client sequential id on bookings (1, 2, 3...) — every
-- booking for a given client counts up regardless of status (scheduled,
-- in_progress, completed, cancelled all get one). Combined with the
-- client's customer_number this forms the displayed job number, e.g.
-- customer_number=1, job_seq=1 -> "001-01". That composite label is NOT
-- stored — it's formatted in the app (see src/lib/customer-numbers.ts)
-- so there is one source of truth (the two integers) and no risk of a
-- stale denormalized string if a number were ever corrected.
--
-- Both columns are nullable so the backfill can run per-tenant safely,
-- but this migration backfills EVERY tenant's existing rows in one pass
-- (customer_number sequence is PARTITION BY tenant_id — each tenant's
-- numbering is independent, tenant A's #1 and tenant B's #1 are
-- unrelated rows). The triggers are global so any client/booking
-- created after this migration gets a number immediately.
--
-- Additive + nullable — safe to run on live prod. Idempotent (guards
-- on IF NOT EXISTS / DROP+CREATE for functions and triggers).

-- 1) Columns ------------------------------------------------------------
ALTER TABLE clients  ADD COLUMN IF NOT EXISTS customer_number INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS job_seq         INTEGER;

-- Unique only among non-null values — other tenants stay NULL for now,
-- and NULL never collides with NULL under a partial unique index.
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_tenant_customer_number
  ON clients(tenant_id, customer_number) WHERE customer_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_client_job_seq
  ON bookings(client_id, job_seq) WHERE job_seq IS NOT NULL;

-- 2) Auto-assign on insert, going forward --------------------------------
CREATE OR REPLACE FUNCTION assign_customer_number() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_number IS NULL THEN
    SELECT COALESCE(MAX(customer_number), 0) + 1 INTO NEW.customer_number
    FROM clients WHERE tenant_id = NEW.tenant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_customer_number ON clients;
CREATE TRIGGER trg_assign_customer_number
  BEFORE INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION assign_customer_number();

CREATE OR REPLACE FUNCTION assign_job_seq() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.job_seq IS NULL AND NEW.client_id IS NOT NULL THEN
    SELECT COALESCE(MAX(job_seq), 0) + 1 INTO NEW.job_seq
    FROM bookings WHERE client_id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_job_seq ON bookings;
CREATE TRIGGER trg_assign_job_seq
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION assign_job_seq();

-- 3) Backfill every tenant's existing rows ---------------------------------
-- Each tenant's client sequence is independent (PARTITION BY tenant_id) —
-- tenant A's customer #1 and tenant B's customer #1 are unrelated rows.
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at ASC, id ASC) AS rn
  FROM clients
  WHERE customer_number IS NULL
)
UPDATE clients SET customer_number = numbered.rn
FROM numbered WHERE clients.id = numbered.id;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY start_time ASC, id ASC) AS rn
  FROM bookings
  WHERE client_id IS NOT NULL AND job_seq IS NULL
)
UPDATE bookings SET job_seq = numbered.rn
FROM numbered WHERE bookings.id = numbered.id;

-- ── Verification (run after) ─────────────────────────────────────────────
-- SELECT COUNT(*) FROM clients WHERE customer_number IS NULL;
-- SELECT COUNT(*) FROM bookings WHERE client_id IS NOT NULL AND job_seq IS NULL;
-- Both should be 0.

-- ── Rollback ──────────────────────────────────────────────────────────────
-- DROP TRIGGER IF EXISTS trg_assign_customer_number ON clients;
-- DROP TRIGGER IF EXISTS trg_assign_job_seq ON bookings;
-- DROP FUNCTION IF EXISTS assign_customer_number();
-- DROP FUNCTION IF EXISTS assign_job_seq();
-- DROP INDEX IF EXISTS idx_clients_tenant_customer_number;
-- DROP INDEX IF EXISTS idx_bookings_client_job_seq;
-- ALTER TABLE clients DROP COLUMN IF EXISTS customer_number;
-- ALTER TABLE bookings DROP COLUMN IF EXISTS job_seq;
