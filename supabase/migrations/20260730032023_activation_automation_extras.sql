-- Activation-automation extras (2026-07-30)
--
-- Supports the post-activation automation pass: a real timestamp for "when
-- did this tenant go live" (for the stalled-onboarding nudge cron), and a
-- day-1 health snapshot distinct from the live-computed score in
-- tenant-account-health.ts (that one is deliberately never stored so it
-- can't go stale; this one is a point-in-time baseline for comparison).
--
-- Idempotent, no destructive ops. GATED — author only, not applied.

DO $$
BEGIN
  RAISE NOTICE 'PRE activation_automation_extras: activated_at exists=%, activation_health_snapshot exists=%',
    (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'activated_at')),
    (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'activation_health_snapshot'));
END $$;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS activated_at timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS activation_health_snapshot jsonb;
-- Send-once marker for the stalled-onboarding nudge cron (cron/onboarding-nudge)
-- so a tenant who never logs in doesn't get re-emailed every day forever.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_nudge_sent_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'activated_at') THEN
    RAISE EXCEPTION 'POST FAILED: tenants.activated_at missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'activation_health_snapshot') THEN
    RAISE EXCEPTION 'POST FAILED: tenants.activation_health_snapshot missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'onboarding_nudge_sent_at') THEN
    RAISE EXCEPTION 'POST FAILED: tenants.onboarding_nudge_sent_at missing';
  END IF;
  RAISE NOTICE 'activation_automation_extras POST OK';
END $$;

-- ROLLBACK:
--   ALTER TABLE tenants DROP COLUMN IF EXISTS onboarding_nudge_sent_at;
--   ALTER TABLE tenants DROP COLUMN IF EXISTS activation_health_snapshot;
--   ALTER TABLE tenants DROP COLUMN IF EXISTS activated_at;
