-- Fourth pipeline stage: Creation -> Onboarding -> Activation -> Completion.
-- Activation (activated_at) means the spine passes and the site technically
-- serves -- an internal/operator checkpoint. Completion is the distinct,
-- explicit, client-facing "launch" moment: exactly one consolidated welcome
-- email goes out here, never during Activation (which is idempotent and can
-- be re-run without re-notifying the client).
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
