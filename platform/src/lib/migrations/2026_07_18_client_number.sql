-- Human-readable, per-tenant sequential customer ID: C-0001, C-0002, ...
-- Same shape as quote_number (Q-YYYYMM-NNNN, see 026_quotes.sql /
-- src/lib/quote.ts) and invoice_number (INV-YYYYMM-NNNN, see
-- 027_invoices.sql / src/lib/invoice.ts) — a human-facing, per-tenant,
-- zero-padded counter — except client_number is NOT month-scoped: it's a
-- single lifetime sequence per tenant (C-0001, C-0002, ... forever), per
-- Jeff's requested format.
--
-- Deliberately NOT the app-code COUNT()-then-insert pattern quotes/invoices
-- use (racy under concurrency; invoices papers over it with a 5-attempt
-- retry loop at the call site). clients has 17+ distinct insert call sites
-- across the codebase (contact form, lead ingest, portal collect, manual
-- lead entry, Selena tool calls, sale-to-booking/recurring conversion,
-- etc.) — replicating a retry loop at every site is a large, easy-to-miss-
-- one-of-them surface. A BEFORE INSERT trigger assigns the number instead:
-- every insert gets a number with zero app-code changes and zero risk of a
-- forgotten call site ever inserting a client with no number.
--
-- Concurrency: the trigger locks the tenant's row FOR UPDATE before
-- computing MAX(existing number)+1, so two concurrent client inserts for
-- the SAME tenant serialize on that lock (second waits for the first's
-- transaction to commit, then sees its number and picks the next one).
-- Same FOR UPDATE-then-compute shape already used by create_booking_atomic
-- (2026_07_13_client_book_dedupe_atomic.sql) and claim_open_job_atomic
-- (2026_07_18_claim_open_job_atomic.sql). Inserts for DIFFERENT tenants
-- never block each other (different row locks).
--
-- FILE ONLY — not applied. Per standing instruction, prod DDL runs only
-- after the leader/Jeff approve it. Before running: confirm the backfill
-- DO block below is acceptable (it assigns numbers to all EXISTING clients
-- in created_at order, per tenant) and that no other in-flight branch has
-- already added a clients.client_number column under a different name.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_number TEXT;

-- Backfill existing rows: per tenant, oldest client first, C-0001 upward.
-- id is the tiebreaker for rows with identical created_at (bulk-imported
-- rows, seed data) so the backfill is deterministic on rerun.
DO $$
DECLARE
  r RECORD;
  n INTEGER := 0;
  cur_tenant UUID := NULL;
BEGIN
  FOR r IN
    SELECT id, tenant_id
    FROM clients
    WHERE client_number IS NULL
    ORDER BY tenant_id, created_at, id
  LOOP
    IF cur_tenant IS DISTINCT FROM r.tenant_id THEN
      cur_tenant := r.tenant_id;
      -- Resume from the current max for this tenant rather than always
      -- restarting at 0, in case this DO block is ever re-run after a
      -- partial backfill (e.g. the trigger below already assigned numbers
      -- to rows inserted between a first partial run and this rerun).
      SELECT COALESCE(MAX(NULLIF(regexp_replace(client_number, '^C-', ''), '')::int), 0)
        INTO n
        FROM clients
        WHERE tenant_id = cur_tenant;
    END IF;
    n := n + 1;
    UPDATE clients SET client_number = 'C-' || LPAD(n::text, 4, '0') WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE clients ALTER COLUMN client_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_tenant_number ON clients(tenant_id, client_number);

CREATE OR REPLACE FUNCTION public.assign_client_number() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_next INTEGER;
BEGIN
  IF NEW.client_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Lock the tenant row so concurrent client inserts for the same tenant
  -- serialize here rather than both reading the same MAX() and colliding
  -- on the unique index above.
  PERFORM 1 FROM public.tenants WHERE id = NEW.tenant_id FOR UPDATE;

  SELECT COALESCE(MAX(NULLIF(regexp_replace(client_number, '^C-', ''), '')::int), 0) + 1
    INTO v_next
    FROM public.clients
    WHERE tenant_id = NEW.tenant_id;

  NEW.client_number := 'C-' || LPAD(v_next::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_client_number ON clients;
CREATE TRIGGER trg_assign_client_number
  BEFORE INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_client_number();
