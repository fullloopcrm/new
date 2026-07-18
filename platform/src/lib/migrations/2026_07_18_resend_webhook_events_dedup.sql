-- 2026_07_18_resend_webhook_events_dedup.sql
-- FILE ONLY -- do NOT execute here. Leader runs after Jeff approves.
--
-- WHY: /api/webhooks/resend has no idempotency guard against at-least-once
-- delivery. Resend delivers webhooks via Svix (confirmed by this route's own
-- verifySvix() call and svix-id/svix-timestamp/svix-signature headers) --
-- Svix's own docs (docs.svix.com/retries) document a retry schedule
-- (immediate, 5s, 5min, 30min, 2h, 5h, 10h, 10h) on any non-2xx or slow
-- (>15s) response, and Svix's own idempotency guidance is to dedupe on the
-- svix-id header, which stays constant across retries of the same logical
-- event. This route also unconditionally returns 200 from its top-level
-- catch, so the realistic trigger isn't an app error -- it's the route
-- missing Svix's 15s response window (no maxDuration override here, unlike
-- most other webhook/cron routes this session touched; a cold start or a
-- slow resolveTenantIdForInboundEmail/DB round-trip is enough).
--
-- Two branches are NOT idempotent on redelivery (found this round, same
-- class already fixed on Telnyx's and Telegram's inbound webhooks this
-- session):
--
-- `email.received` -- unconditionally INSERTs a new inbound_emails row with
-- no dedup key at all. A redelivery creates a duplicate email in the admin
-- inbox (src/app/admin or dashboard inbound-email UI) -- a real duplicate
-- item an admin sees and could act on twice.
--
-- `email.complained` / `email.bounced` -- the clients.email_marketing_opt_out
-- UPDATE is idempotent (setting true twice is harmless), but the
-- marketing_opt_out_log INSERT is not -- a redelivery writes a second audit
-- row that misleadingly looks like a second, independent complaint/bounce
-- event for the same client.
--
-- The remaining branches (email.delivered/opened/bounced's
-- campaign_recipients status UPDATE + aggregate recount) are naturally
-- idempotent re-derived state -- reprocessing those is harmless, same as
-- Telnyx's message.sent/delivered/failed branches. Claimed once, before any
-- type branch, same shape as telnyx-voice's whole-handler claim (simpler
-- than scoping to only the 2 unsafe branches; harmless no-op overhead on
-- the already-idempotent ones).
--
-- No backfill needed -- brand-new table, nothing to dedupe retroactively.

CREATE TABLE IF NOT EXISTS resend_webhook_events (
  event_id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
