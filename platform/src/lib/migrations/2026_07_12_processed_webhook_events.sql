-- 2026_07_12_processed_webhook_events.sql
-- Idempotency ledger for inbound webhooks (W6 deploy-prep, 2026-07-12).
--
-- Backs the fail-closed check-and-insert dedupe helper described in
-- deploy-prep/webhook-dedupe-helper-design.md. Each non-idempotent inbound
-- handler (telnyx SMS message.received, all telegram routes, resend
-- email.received) claims a row here BEFORE doing side-effecting work; the
-- UNIQUE(provider, event_id) constraint makes a redelivered event fail the
-- insert, and the handler short-circuits instead of re-running the AI agent /
-- re-sending SMS / inserting a duplicate row.
--
-- Same shape as the existing Stripe guard (payments.stripe_session_id) but
-- generalized across providers.
--
-- ⚠️ FILE ONLY — DO NOT RUN HERE. Leader/Jeff applies prod DDL after approval:
--   Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/2026_07_12_processed_webhook_events.sql
--
-- Safe to run before the handlers are wired up: an empty ledger changes no
-- behavior. Backfill is unnecessary — only forward replays need protection.

BEGIN;

CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Which provider sent the event. Namespaces event_id so two providers can
  -- reuse the same opaque id without colliding.
  provider text NOT NULL,
  -- The provider's own event/update id: Telnyx data.id, Telegram update_id,
  -- Resend data.email_id / svix-id. Opaque to us — stored as text.
  event_id text NOT NULL,
  -- Resolved tenant when known. NULLABLE: telegram/voice events may be claimed
  -- before (or without) tenant resolution, so this is diagnostic, not part of
  -- the dedupe key.
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT processed_webhook_events_provider_event_uniq UNIQUE (provider, event_id)
);

-- Retention/cleanup queries prune by age; index the sweep column.
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_received_at
  ON processed_webhook_events (received_at);

-- Deny-all RLS to match the house posture for new tables (see
-- 046_rls_deny_on_new_tables.sql). The API routes use the service-role key,
-- which BYPASSES RLS, so this is a no-op for current code paths but blocks any
-- future user-scoped JWT from ever reading the webhook ledger.
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_all_processed_webhook_events" ON processed_webhook_events;
CREATE POLICY "deny_all_processed_webhook_events" ON processed_webhook_events
  FOR ALL TO public USING (false) WITH CHECK (false);

COMMIT;
