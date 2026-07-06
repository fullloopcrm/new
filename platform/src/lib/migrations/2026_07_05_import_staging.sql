-- Import staging — Stage 3 of the onboarding redesign.
-- Uploads land in a batch of staged rows the operator reviews (matched / new /
-- duplicate / unmatched / rejected) BEFORE anything is written to live tables.
-- Commit writes the accepted rows and records each target_id so the whole batch
-- can be UNDONE cleanly. The raw file/mapping is retained so a bad map is
-- re-runnable without re-obtaining the data.
--
-- Additive: two new tables, no change to clients/bookings. RLS enabled with no
-- policies (service-role only, matching the platform's other operator tables).

CREATE TABLE IF NOT EXISTS import_batches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('clients','schedules','finance')),
  source_filename TEXT,
  mapping       JSONB,                         -- the AI/operator column→field map used
  status        TEXT NOT NULL DEFAULT 'staged' CHECK (status IN ('staged','committed','undone')),
  total_rows    INTEGER NOT NULL DEFAULT 0,
  committed_rows INTEGER NOT NULL DEFAULT 0,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  committed_at  TIMESTAMPTZ,
  undone_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS import_rows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id      UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  row_index     INTEGER NOT NULL,
  raw           JSONB,                          -- original row, retained for re-map
  mapped        JSONB,                          -- normalized to the target schema
  match_status  TEXT NOT NULL DEFAULT 'new' CHECK (match_status IN ('new','matched','duplicate','unmatched','rejected')),
  match_detail  TEXT,
  target_table  TEXT,                           -- clients | bookings | recurring_schedules
  target_id     UUID,                           -- set on commit; drives undo
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_batches_tenant ON import_batches(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_import_rows_batch ON import_rows(batch_id);
CREATE INDEX IF NOT EXISTS idx_import_rows_tenant ON import_rows(tenant_id);

ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_rows    ENABLE ROW LEVEL SECURITY;
-- No policies: operator import runs via the service-role client (supabaseAdmin),
-- same as the platform's other admin-only tables. RLS-on with no policy denies
-- anon/authenticated by default.
