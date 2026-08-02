-- Lightweight labels for comhub_threads, independent of `channel`. Needed
-- because the new anonymous web-chatbot widget and the existing authenticated
-- client-portal chat both use channel='web' — tags let ComHub tell them apart
-- (and anything else that needs labeling later) without another enum column.
alter table comhub_threads add column if not exists tags text[] not null default '{}';

create index if not exists idx_comhub_threads_tags on comhub_threads using gin (tags);

notify pgrst, 'reload schema';
