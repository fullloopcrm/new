-- Tenant-scoped customer feedback, ported from nycmaid's client_feedback
-- system (commits 1185a66e, a37e77ba, 16e0bdfe, 78e3b2db, e1856912) and
-- adapted for multi-tenancy — every row is tenant_id-scoped, unlike
-- nycmaid's single-tenant original.
--
-- Separate from `reviews` (star-rating collection via /api/portal/feedback,
-- requires portal login) and `platform_feedback` (anonymous product feedback
-- about FullLoop CRM itself, /api/feedback). This table is for a tenant's
-- OWN customers giving feedback about THEIR service, reachable without
-- login (SMS link, QR code, etc.), and surfaced under Clients -> Feedback.
--
-- Every submission lands here, tagged by category:
--   'client'    — phone matched an existing client on file
--   'anonymous' — submitter checked "prefer to stay anonymous"
--   'unmatched' — gave a name/phone but it didn't match any client;
--                 captured as-typed via submitted_name/submitted_phone
--
-- credit_cents/credit_applied track a one-time $ credit earned by replying
-- to a feedback-request campaign (see campaigns.campaign_type below) —
-- surfaced in the admin tab as "pending"; NOT auto-applied to booking
-- creation in this pass (see deploy-prep/pending-migrations-runbook.md
-- for why, and W4's concurrent booking-discount work in this batch).
--
-- FILE ONLY — not applied. Per standing instruction, prod DDL runs only
-- after the leader/Jeff approve it.

CREATE TABLE IF NOT EXISTS client_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'web',
  message text NOT NULL,
  category text NOT NULL DEFAULT 'unmatched' CHECK (category IN ('client', 'anonymous', 'unmatched')),
  is_anonymous boolean NOT NULL DEFAULT false,
  submitted_name text,
  submitted_phone text,
  credit_cents integer,
  credit_applied boolean NOT NULL DEFAULT false,
  credit_applied_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_feedback_tenant ON client_feedback(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_feedback_client ON client_feedback(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_feedback_campaign ON client_feedback(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_feedback_credit_unapplied ON client_feedback(tenant_id, client_id)
  WHERE credit_applied = false AND credit_cents IS NOT NULL;

-- Marks a campaign as a feedback-request campaign and sets the $ credit (in
-- cents) queued when a recipient replies. Existing campaigns are unaffected
-- (default 'promo'). Reply detection in the Telnyx webhook looks up the
-- sender's most recent sent campaign_recipients row and checks
-- campaign_type = 'feedback'.
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS campaign_type text NOT NULL DEFAULT 'promo';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS reply_credit_cents integer;
