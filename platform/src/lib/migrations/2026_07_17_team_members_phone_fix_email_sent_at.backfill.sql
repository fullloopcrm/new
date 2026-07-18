-- 2026_07_17_team_members_phone_fix_email_sent_at.backfill.sql
-- FILE ONLY — do NOT execute here. Leader runs after Jeff approves, AFTER
-- 2026_07_17_team_members_phone_fix_email_sent_at.sql has added the column.
--
-- The new column defaults every existing row to the epoch, which would make
-- every cleaner "eligible" again the instant the migration lands -- including
-- ones the old notifications-scan mechanism genuinely emailed within the
-- last 7 days. This backfill recovers that real history from the
-- notifications audit trail (type='phone_fix_email', cleaner_id parsed out
-- of the same `cleaner_id=<uuid> email=<email>` message format the route
-- already writes) so post-migration eligibility matches pre-migration
-- eligibility instead of causing a one-time duplicate-email burst.

update team_members tm
set phone_fix_email_sent_at = latest.sent_at
from (
  select
    (substring(n.message from 'cleaner_id=([0-9a-fA-F-]{36})'))::uuid as cleaner_id,
    max(n.created_at) as sent_at
  from notifications n
  where n.type = 'phone_fix_email'
    and n.message ~ 'cleaner_id=[0-9a-fA-F-]{36}'
  group by 1
) latest
where tm.id = latest.cleaner_id
  and (tm.phone_fix_email_sent_at is null or tm.phone_fix_email_sent_at < latest.sent_at);
