-- campaign_recipients is missing telnyx_message_id, the column
-- webhooks/telnyx/route.ts's delivery-status handler (message.sent /
-- message.delivered / message.failed) has always looked up campaign SMS
-- recipients by (.eq('telnyx_message_id', msgId)). This is the SMS-side
-- twin of migration 064's resend_email_id finding: campaign_recipients'
-- original CREATE TABLE (008_missing_tables_and_columns.sql) and its only
-- other column-adding migration (010_nycmaid_parity_columns_2.sql, sent_at
-- only) never defined telnyx_message_id. sms_logs has its own
-- telnyx_message_id column (2026_05_19_remaining_tables.sql) — a different
-- table entirely, for the general SMS log, not campaign tracking. Net
-- effect: every campaign SMS delivered/failed status update in
-- webhooks/telnyx/route.ts either errors (column doesn't exist) or matches
-- zero rows, so a campaign's delivered_count/failed_count aggregate has
-- never reflected real Telnyx delivery outcomes for the SMS channel, only
-- the sender's own local try/catch result at send time — same shape as
-- migration 064's email finding, just the SMS leg of the identical gap.
-- Worktree has no .env.local/Supabase env to confirm live
-- information_schema directly, same verification discipline as
-- migrations 063/064.
--
-- Additive-only: adding this column alone does not make SMS delivery
-- tracking start working — campaigns/send/route.ts's SMS send loop (via
-- notify()'s sms branch) also never captures/stores the Telnyx message id
-- sendSMS() already returns in its response body (the exact id field this
-- codebase's own src/lib/nycmaid/sms.ts already captures and stores as
-- telnyx_message_id on a different table, sms_logs) — so
-- campaign_recipients.telnyx_message_id would stay NULL on every row even
-- after this migration runs. That application-code wiring is a separate,
-- deliberately deferred follow-up (needs this migration live first —
-- writing to a column that doesn't yet exist would silently no-op at best,
-- error at worst, in prod). Prepared, not applied — prod DDL needs Jeff's
-- per-migration go per the standing rule.

ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS telnyx_message_id TEXT;

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_telnyx_message_id
  ON campaign_recipients(telnyx_message_id)
  WHERE telnyx_message_id IS NOT NULL;
