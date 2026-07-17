-- marketing_opt_out_log.method's CHECK constraint (migration
-- 050_nycmaid_parity_2026_04_29.sql) only allows 'email_link', 'sms_stop',
-- 'admin'. webhooks/resend/route.ts is being extended (this session) to
-- auto-suppress a client's email marketing on a Resend `email.complained`
-- (spam report) or `email.bounced` (Resend's own docs: "the recipient's
-- mail server permanently rejected the email" — already a hard/final bounce,
-- not transient) event, writing an audit row here same as the existing
-- `/api/unsubscribe` link-click and SMS-STOP paths already do. Neither new
-- method value fits the existing three, and a value outside the CHECK list
-- would either violate the constraint (if 050's stricter version is the one
-- actually live) or silently succeed with no enforcement (if 007's earlier,
-- looser `CREATE TABLE IF NOT EXISTS` — same table name, no CHECK — is what
-- actually applied, since it's numbered before 050 and a duplicate
-- `CREATE TABLE IF NOT EXISTS` is a no-op when the table already exists).
-- No live Supabase env in this worktree to confirm which shape is live —
-- this migration is written to be correct under BOTH: `DROP CONSTRAINT IF
-- EXISTS` no-ops harmlessly if 007's constraint-less shape is what's live,
-- and re-adding under the same auto-generated name
-- (`marketing_opt_out_log_method_check`, Postgres's standard
-- `<table>_<column>_check` naming for an unnamed inline CHECK) is a no-op
-- if the name doesn't match some other actual live constraint name -- in
-- which case the ADD CONSTRAINT below still lands and the old constraint
-- would need a manual follow-up DROP, flagged here rather than guessed at.
--
-- Distinct method values (not reusing 'admin') so an audit trail can show
-- *why* a client got opted out — a spam complaint vs. a hard bounce vs. a
-- staff action are different facts for a TCPA/CAN-SPAM defense, not the
-- same event lumped together.
--
-- Prepared, not applied — prod DDL needs Jeff's per-migration go per the
-- standing rule.

ALTER TABLE marketing_opt_out_log DROP CONSTRAINT IF EXISTS marketing_opt_out_log_method_check;

ALTER TABLE marketing_opt_out_log ADD CONSTRAINT marketing_opt_out_log_method_check
  CHECK (method IN ('email_link', 'sms_stop', 'admin', 'email_complaint', 'email_bounce'));
