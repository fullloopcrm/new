-- 2026_07_18_stripe_webhook_events_dedup.sql
-- FILE ONLY -- do NOT execute here. Leader runs after Jeff approves.
--
-- WHY: /api/webhooks/stripe has no top-level idempotency guard against
-- at-least-once delivery. Stripe's own webhook docs are explicit: "Stripe
-- may occasionally send the same event more than once" (network retries,
-- non-2xx responses, and manual re-sends from the Dashboard all replay the
-- identical event.id) -- same retry-on-non-2xx/slow-response class already
-- fixed this session on Telnyx/Telegram/Resend/Clerk. This handler is
-- idempotent for SOME event types via type-specific side channels
-- (checkout.session.completed's stripe_session_id UNIQUE constraint;
-- charge.refunded/charge.dispute.*'s ledger posts via journalEntryExists),
-- but three side effects have no guard at all and duplicate on every
-- redelivery:
--   - charge.dispute.created inserts a fresh admin_tasks 'chargeback' row
--     every delivery -- a redelivered dispute-opened event spams duplicate
--     high-priority tasks for the same dispute.
--   - payment_intent.payment_failed inserts a fresh notifications row AND a
--     fresh admin_tasks row every delivery -- same duplication.
--   - invoice.payment_failed re-sends the admin "subscription payment
--     failed" email every delivery.
-- Claiming event.id (Stripe's own documented dedup key) before the switch
-- runs closes all three the same way svix-id/telnyx's own ids did for the
-- other three surfaces -- one guard covers every event type, including any
-- future case branch that forgets to add its own idempotency check.
--
-- No backfill needed -- brand-new table, nothing to dedupe retroactively.

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
