-- PROPOSED — not yet applied to prod. File-only per worker rules; leader runs
-- prod DDL after Jeff approves.
--
-- Backs telegram-webhook-dedup.ts's claimTelegramUpdate(). Telegram retries
-- webhook delivery when the handler doesn't ack quickly, and all three
-- Telegram webhook routes (platform-owner, jefe, per-tenant) run an LLM
-- agent loop that can call side-effecting owner tools (refunds, broadcasts,
-- cron triggers). Without a dedup backstop, a retried delivery reprocesses
-- the same inbound message and can re-trigger those side effects. Each
-- Telegram Update carries a bot-scoped unique update_id; claim it via
-- insert-first so a retry's insert 23505s and is skipped as a no-op — same
-- pattern as schedule_issues / clients import / journal_entries dedup this
-- session.
--
-- bot_scope matches telegram-webhook-auth.ts's scope strings:
--   'platform-owner', 'jefe', `tenant:<tenantId>`

CREATE TABLE IF NOT EXISTS telegram_webhook_events (
  id BIGSERIAL PRIMARY KEY,
  bot_scope TEXT NOT NULL,
  update_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bot_scope, update_id)
);

-- Deliveries are only ever retried within minutes, not months — keep this
-- table small. Prune rows older than 7 days (run periodically, e.g. from an
-- existing daily cron; not wired to one here, file-only).
-- DELETE FROM telegram_webhook_events WHERE created_at < now() - interval '7 days';
