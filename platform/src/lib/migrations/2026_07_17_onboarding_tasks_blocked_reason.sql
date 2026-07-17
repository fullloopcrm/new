-- Item (163): continuing (162)'s surface -- onboarding_tasks.status's declared
-- 'blocked' value (037_leads_qualification.sql CHECK constraint) has no reason
-- column at all, unlike every sibling exception-status elsewhere in this
-- codebase (documents.declined -> decline_reason, prospects.rejected ->
-- reject_reason, accounting_periods.reopened -> reopened_reason). Once (162)
-- wired a real path to mark a task 'blocked', it would otherwise carry zero
-- information about why -- the tenant sees a bare red pill with no context.
--
-- Additive only. Application code clears this on any transition away from
-- 'blocked' (same discipline as (161): a stale reason must not survive a
-- status change it no longer describes).

ALTER TABLE onboarding_tasks ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
