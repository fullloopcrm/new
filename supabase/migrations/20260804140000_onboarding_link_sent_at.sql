-- Fixes a real duplicate-send bug found live (2026-08-04): the onboarding-
-- link email ("Welcome to Full Loop — let's get your business set up") only
-- guarded against re-sending to an already-ACTIVE tenant. A tenant sitting in
-- 'setup' (incomplete profile, failed domain registration, etc.) got this
-- email re-sent on every single Activate click — confirmed on Template
-- Preview (created 2026-08-03, re-sent 2026-08-04 on a test Activate click).
--
-- This column gives createAndSendOnboardingLink() real memory of "already
-- sent once" so activate-tenant.ts can guard on that directly, independent
-- of tenant status.
--
-- Idempotent: IF NOT EXISTS. No destructive ops. GATED — author only, do not
-- apply without Jeff's explicit go per THE PROCEDURE in
-- platform/docs/runbooks/migration-runbook.md.

-- ─── PRE (informational — confirm nothing here already exists) ─────────
DO $$
BEGIN
  RAISE NOTICE 'PRE onboarding_link_sent_at: column exists=%',
    (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'onboarding_link_sent_at'));
END $$;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_link_sent_at TIMESTAMPTZ;

-- ─── POST (assertion — must emit "POST OK", never raise) ────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'onboarding_link_sent_at') THEN
    RAISE EXCEPTION 'POST FAILED: tenants.onboarding_link_sent_at missing';
  END IF;
  RAISE NOTICE 'onboarding_link_sent_at POST OK';
END $$;

-- ─── ROLLBACK ────────────────────────────────────────────────────────────
--   ALTER TABLE tenants DROP COLUMN IF EXISTS onboarding_link_sent_at;
