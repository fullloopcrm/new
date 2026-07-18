-- Adds a notify-once marker to seo_issues so the owner-alert digest cron
-- (cron/seo-alert-digest) can push each open issue to Jeff's Telegram
-- exactly once, instead of re-alerting the same still-open issue every day
-- the digest runs. NULL = never notified; set to now() the moment a digest
-- run reports it. The weekly seo-technical rescan deletes+reinserts the open
-- not_indexed set fresh each run, so a page that's still broken next week
-- gets a genuinely new row (notified_at NULL again) and is re-flagged --
-- that's the intended "still open" signal, not spam.
alter table seo_issues add column if not exists notified_at timestamptz;
create index if not exists idx_seo_issues_notify_pending on seo_issues (type, status) where notified_at is null;
