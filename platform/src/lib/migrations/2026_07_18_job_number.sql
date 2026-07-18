-- Human-readable, per-tenant, per-year job number: {tenant-prefix}-{year}-{seq}
-- e.g. "NM-2026-0142" (Jeff's exact spec, corrected 2026-07-18 16:21 from an
-- earlier "C-0001" customer-number format that was wrongly assumed to be
-- this same feature). The sequence resets each year, per tenant, because the
-- format carries a year segment.
--
-- This is a SEPARATE concern from 2026_07_18_client_number.sql:
--   - client_number (C-0001) = a per-tenant customer identifier on `clients`,
--     lifetime sequence, no year segment. Not touched by this file.
--   - job_number (NM-2026-0142) = a per-tenant, per-year, human-facing display
--     number on `jobs`, branded with a short tenant prefix ("Job 142" is how
--     Jeff refers to it verbally -- the full number is what's shown/printed).
-- Same trigger shape (BEFORE INSERT, tenant-row FOR UPDATE lock) as
-- client_number and create_booking_atomic/claim_open_job_atomic, so all
-- existing jobs-insert call sites get a number with zero app-code changes.
--
-- Tenant prefix: there is no existing "short code" column on tenants (slug
-- is a full kebab-case string, e.g. "the-nyc-maid" -- not usable directly as
-- a 2-4 char brand prefix). This adds tenants.job_number_prefix, nullable,
-- so an admin can set an intentional prefix later. Until set, the prefix is
-- derived from tenants.name (initials of its words, common filler words
-- dropped) as a reasonable default -- NOT a guaranteed-correct brand code.
-- The leader/Jeff should review derived prefixes for existing tenants before
-- this migration is approved to run, and can update job_number_prefix
-- directly (or re-run the backfill) if a derived value is wrong.
--
-- FILE ONLY — not applied. Per standing instruction, prod DDL runs only
-- after the leader/Jeff approve it. Before running: confirm no other
-- in-flight branch has already added a jobs.job_number or
-- tenants.job_number_prefix column under a different name/shape.

-- ─── prefix derivation helper (shared by backfill + trigger) ───
CREATE OR REPLACE FUNCTION public.derive_tenant_job_prefix(p_name TEXT) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_words TEXT[];
  v_word TEXT;
  v_prefix TEXT := '';
BEGIN
  v_words := regexp_split_to_array(upper(trim(coalesce(p_name, ''))), '[^A-Z0-9]+');
  FOREACH v_word IN ARRAY v_words LOOP
    IF v_word = '' OR v_word IN ('THE', 'AND', 'OF', 'LLC', 'INC', 'CO', 'CORP') THEN
      CONTINUE;
    END IF;
    v_prefix := v_prefix || left(v_word, 1);
  END LOOP;

  -- Single-word names ("Sparkle") produce a 1-char prefix from the loop
  -- above; fall back to the first 2 alnum chars of the name instead.
  IF char_length(v_prefix) < 2 THEN
    v_prefix := left(regexp_replace(upper(coalesce(p_name, '')), '[^A-Z0-9]', '', 'g'), 2);
  END IF;

  IF v_prefix = '' THEN
    v_prefix := 'TN'; -- ultimate fallback: name had no alnum chars at all
  END IF;

  RETURN left(v_prefix, 4);
END;
$$;

-- ─── tenants.job_number_prefix ───
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS job_number_prefix TEXT
  CHECK (job_number_prefix IS NULL OR job_number_prefix ~ '^[A-Z0-9]{1,10}$');

UPDATE tenants
SET job_number_prefix = public.derive_tenant_job_prefix(name)
WHERE job_number_prefix IS NULL;

-- ─── jobs.job_number ───
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_number TEXT;

-- Backfill existing rows: per tenant per year (the sequence's reset
-- boundary), oldest job first, {prefix}-{year}-0001 upward. id is the
-- tiebreaker for rows with identical created_at (bulk-imported rows, seed
-- data) so the backfill is deterministic on rerun.
DO $$
DECLARE
  r RECORD;
  n INTEGER := 0;
  cur_tenant UUID := NULL;
  cur_year INTEGER := NULL;
BEGIN
  FOR r IN
    SELECT j.id, j.tenant_id, EXTRACT(YEAR FROM j.created_at)::int AS yr,
           COALESCE(t.job_number_prefix, public.derive_tenant_job_prefix(t.name)) AS prefix
    FROM jobs j
    JOIN tenants t ON t.id = j.tenant_id
    WHERE j.job_number IS NULL
    ORDER BY j.tenant_id, yr, j.created_at, j.id
  LOOP
    IF cur_tenant IS DISTINCT FROM r.tenant_id OR cur_year IS DISTINCT FROM r.yr THEN
      cur_tenant := r.tenant_id;
      cur_year := r.yr;
      -- Resume from the current max for this tenant+year rather than always
      -- restarting at 0, in case this DO block is ever re-run after a
      -- partial backfill (e.g. the trigger below already assigned numbers
      -- to rows inserted between a first partial run and this rerun).
      -- Sequence digits start right after "{prefix}-{year}-" (prefix length
      -- + 1 hyphen + 4 year digits + 1 hyphen = prefix length + 6).
      SELECT COALESCE(MAX(substring(job_number FROM char_length(r.prefix) + 7)::int), 0)
        INTO n
        FROM jobs
        WHERE tenant_id = cur_tenant
          AND job_number LIKE r.prefix || '-' || cur_year || '-%';
    END IF;
    n := n + 1;
    UPDATE jobs SET job_number = r.prefix || '-' || r.yr || '-' || LPAD(n::text, 4, '0') WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE jobs ALTER COLUMN job_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_tenant_number ON jobs(tenant_id, job_number);

CREATE OR REPLACE FUNCTION public.assign_job_number() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_prefix TEXT;
  v_year INTEGER;
  v_next INTEGER;
BEGIN
  IF NEW.job_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Lock the tenant row so concurrent job inserts for the same tenant
  -- serialize here rather than both reading the same MAX() and colliding
  -- on the unique index above. Inserts for DIFFERENT tenants never block
  -- each other (different row locks). Same shape as assign_client_number
  -- (2026_07_18_client_number.sql) and claim_open_job (2026_07_18_claim_
  -- open_job_atomic.sql).
  SELECT COALESCE(job_number_prefix, public.derive_tenant_job_prefix(name))
    INTO v_prefix
    FROM public.tenants
    WHERE id = NEW.tenant_id
    FOR UPDATE;

  -- created_at's column DEFAULT (now()) is applied before BEFORE INSERT
  -- triggers run, so NEW.created_at normally already holds the insert
  -- timestamp here; COALESCE to now() only guards an explicit NULL insert.
  v_year := EXTRACT(YEAR FROM COALESCE(NEW.created_at, now()))::int;

  SELECT COALESCE(MAX(substring(job_number FROM char_length(v_prefix) + 7)::int), 0) + 1
    INTO v_next
    FROM public.jobs
    WHERE tenant_id = NEW.tenant_id
      AND job_number LIKE v_prefix || '-' || v_year || '-%';

  NEW.job_number := v_prefix || '-' || v_year || '-' || LPAD(v_next::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_job_number ON jobs;
CREATE TRIGGER trg_assign_job_number
  BEFORE INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_job_number();
