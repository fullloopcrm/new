-- Jobs / Projects — multi-day work with a payment plan.
--
-- WHY: a cleaning is one booking, one price, one day. A landscaping / remodel /
-- dumpster job runs across multiple sessions and multiple payments (deposit →
-- progress → final, or named milestones). We EXTEND, we do NOT replace:
--   • a Job owns N bookings   (the schedule — each booking = one work session/day)
--   • a Job owns N job_payments (the payment plan — deposit/progress/final/milestones)
--   • cleaning stays exactly as-is: a standalone booking with job_id = NULL (N=1)
--
-- Additive + nullable — safe to run on live prod. Nothing about existing bookings
-- or the cleaning flow changes.

-- ─── jobs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id    UUID REFERENCES clients(id) ON DELETE SET NULL,
  quote_id     UUID REFERENCES quotes(id) ON DELETE SET NULL,   -- source quote, if any

  title        TEXT,
  status       TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),

  -- Money snapshot (cents). Contracted total; payment plan sums to this.
  total_cents  INTEGER NOT NULL DEFAULT 0,

  service_address TEXT,
  notes           TEXT,

  starts_on    DATE,          -- first scheduled work day
  ends_on      DATE,          -- last scheduled work day (span for project trades)

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_tenant_status ON jobs(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_quote         ON jobs(quote_id);

-- ─── quotes point at the job they converted into ───────
-- (quotes.converted_booking_id already exists for the cleaning path; projects
--  convert to a job instead.)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS converted_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;

-- ─── bookings gain a parent job ─────────────────────────
-- NULL = standalone booking (cleaning, N=1). Set = one session of a multi-day job.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_job ON bookings(job_id);

-- ─── job_payments — the payment plan ────────────────────
-- One row per scheduled payment. deposit → progress → final, or named milestones.
CREATE TABLE IF NOT EXISTS job_payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id       UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  label        TEXT NOT NULL,          -- 'Deposit', 'Progress', 'Final', or a milestone name
  kind         TEXT NOT NULL DEFAULT 'milestone'
    CHECK (kind IN ('deposit', 'progress', 'final', 'milestone')),
  amount_cents INTEGER NOT NULL DEFAULT 0,

  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'invoiced', 'paid', 'void')),
  due_at       TIMESTAMPTZ,
  paid_at      TIMESTAMPTZ,

  -- Links to existing money rails (reuse, don't reinvent).
  invoice_id       UUID REFERENCES invoices(id) ON DELETE SET NULL,
  stripe_payment_intent TEXT,

  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_payments_job    ON job_payments(job_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_job_payments_status ON job_payments(tenant_id, status, due_at);

-- ─── job_events — the job timeline ──────────────────────
-- Append-only log of what happened on a job: created, scheduled, started,
-- session_completed, payment_invoiced, payment_paid, completed, note. This is
-- what Jefe / the operator read to see a project's history at a glance.
CREATE TABLE IF NOT EXISTS job_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id     UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,          -- created | scheduled | started | session_completed | payment_invoiced | payment_paid | completed | cancelled | note
  detail     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_events_job ON job_events(job_id, created_at DESC);
