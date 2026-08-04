-- SMS channel for platform_campaigns — mirrors campaigns' channel/sms_body
-- split. body stays the email HTML; sms_body is separate plain-text SMS copy.
alter table platform_campaigns add column if not exists channel text not null default 'email' check (channel in ('email', 'sms', 'both'));
alter table platform_campaigns add column if not exists sms_body text;
