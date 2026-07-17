-- campaign_recipients is missing the columns webhooks/resend/route.ts has
-- always written to on email.delivered / email.opened / email.bounced:
-- resend_email_id (the join key back from a Resend webhook event to the
-- local recipient row), delivered_at, and opened_at. None of these appear
-- in any tracked migration (008_missing_tables_and_columns.sql's original
-- CREATE TABLE and 010_nycmaid_parity_columns_2.sql's later sent_at add are
-- the only two migrations that have ever touched this table's columns).
-- Net effect: every `.eq('resend_email_id', emailId)` lookup in the resend
-- webhook either errors (column doesn't exist) or matches nothing, so the
-- webhook's whole delivered/opened/bounced update — and the campaign-level
-- delivered_count/opened_count/failed_count aggregate recount that depends
-- on it — has been dead code since inception. Worktree has no
-- .env.local/Supabase env to confirm live `information_schema` directly, so
-- this is flagged as strong static evidence (three columns, all three
-- referenced only by this one webhook, none defined anywhere in the tracked
-- migration history), same verification discipline as migration 063.
--
-- Additive-only: adding these columns alone does not make delivered/opened
-- tracking start working — the send path (campaigns/send/route.ts, via
-- notify()'s email branch) also never captures/stores the Resend email id
-- returned by sendEmail() at send time, so campaign_recipients.resend_email_id
-- would stay NULL on every row even after this migration runs. That
-- application-code wiring is a separate, deliberately deferred follow-up
-- (needs this migration live first — writing to a column that doesn't yet
-- exist would silently no-op at best, error at worst, in prod). Prepared,
-- not applied — prod DDL needs Jeff's per-migration go per the standing rule.

ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS resend_email_id TEXT;
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_resend_email_id
  ON campaign_recipients(resend_email_id)
  WHERE resend_email_id IS NOT NULL;
