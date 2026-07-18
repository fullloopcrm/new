-- 2026_07_18_clerk_webhook_events_dedup.sql
-- FILE ONLY -- do NOT execute here. Leader runs after Jeff approves.
--
-- WHY: /api/webhooks/clerk has no idempotency guard against at-least-once
-- delivery. Clerk delivers webhooks via Svix (confirmed by this route's own
-- verifySvix() call and svix-id/svix-timestamp/svix-signature headers,
-- Clerk's own webhook docs) -- same retry-on-non-2xx/slow-response class
-- already fixed on Telnyx/Telegram/Resend this session. user.updated and
-- user.deleted are UPDATE/DELETE to a fixed target state, so an EXACT
-- redelivery is naturally idempotent -- but an OUT-OF-ORDER retry is not: if
-- an earlier user.updated is delayed (queued for retry after a slow/failed
-- first attempt) past a later user.updated that already landed, the stale
-- retry re-applies last and silently reverts the newer email/name. Claiming
-- the svix-id (Svix's own documented redelivery-dedup key) before any
-- branch runs closes that gap the same way it did for the other three
-- surfaces.
--
-- No backfill needed -- brand-new table, nothing to dedupe retroactively.

CREATE TABLE IF NOT EXISTS clerk_webhook_events (
  event_id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
