-- Job (project) numbers (2026-07-23, part 2)
--
-- Extends 2026_07_23_customer_job_numbers.sql to the `jobs` table
-- (multi-session projects — landscaping/dumpster/etc., see
-- src/lib/migrations/2026_07_02_jobs_projects.sql). Same pattern:
-- job_seq is a per-client sequence, auto-assigned on insert, combined
-- with clients.customer_number in the app (formatJobNumber) to show
-- e.g. "007-01" at the top of a project's detail page. Independent of
-- bookings.job_seq — a project and its individual booking sessions
-- each get their own number in their own sequence space.
--
-- Additive + nullable — safe to run on live prod. Idempotent.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_seq INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_client_job_seq
  ON jobs(client_id, job_seq) WHERE job_seq IS NOT NULL;

CREATE OR REPLACE FUNCTION assign_project_job_seq() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.job_seq IS NULL AND NEW.client_id IS NOT NULL THEN
    SELECT COALESCE(MAX(job_seq), 0) + 1 INTO NEW.job_seq
    FROM jobs WHERE client_id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_project_job_seq ON jobs;
CREATE TRIGGER trg_assign_project_job_seq
  BEFORE INSERT ON jobs
  FOR EACH ROW EXECUTE FUNCTION assign_project_job_seq();

-- Backfill every tenant's existing projects
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY created_at ASC, id ASC) AS rn
  FROM jobs
  WHERE client_id IS NOT NULL AND job_seq IS NULL
)
UPDATE jobs SET job_seq = numbered.rn
FROM numbered WHERE jobs.id = numbered.id;

-- ── Verification (run after) ─────────────────────────────────────────────
-- SELECT COUNT(*) FROM jobs WHERE client_id IS NOT NULL AND job_seq IS NULL;
-- Should be 0.

-- ── Rollback ──────────────────────────────────────────────────────────────
-- DROP TRIGGER IF EXISTS trg_assign_project_job_seq ON jobs;
-- DROP FUNCTION IF EXISTS assign_project_job_seq();
-- DROP INDEX IF EXISTS idx_jobs_client_job_seq;
-- ALTER TABLE jobs DROP COLUMN IF EXISTS job_seq;
