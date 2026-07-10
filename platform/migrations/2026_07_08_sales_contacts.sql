-- Canonical sales contact (the person). Leads (partner_requests) attach to a
-- contact via contact_id. One contact can carry many leads over time; dedupe by
-- email. This is the long-term spine for the admin Sales → Contacts tab.

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  business_name    text,
  contact_name     text,
  email            text,
  phone            text,
  service_category text,
  city             text,
  state            text,
  source           text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- One contact per email (case-insensitive), only when an email is present.
create unique index if not exists contacts_email_unique
  on contacts (lower(email))
  where email is not null and email <> '';

-- Leads reference their contact. ON DELETE SET NULL: deleting a contact does not
-- delete the lead history (and vice-versa — a lead delete never orphans a contact).
alter table partner_requests
  add column if not exists contact_id uuid references contacts(id) on delete set null;

create index if not exists partner_requests_contact_id_idx
  on partner_requests(contact_id);

-- Connect a lead to the territories system: which service_category it is and
-- which territory it belongs to (both nullable — set from the New Lead form).
alter table partner_requests
  add column if not exists category_id  uuid references service_categories(id) on delete set null,
  add column if not exists territory_id uuid references territories(id) on delete set null;

-- Backfill: one contact per existing lead, deduped by email (earliest lead wins
-- as the seed row). Leads without an email are skipped (nothing to dedupe on).
insert into contacts (business_name, contact_name, email, phone, service_category, city, state, source, created_at)
select distinct on (lower(email))
  business_name, contact_name, lower(email), phone, service_category, city, state, referral_source, created_at
from partner_requests
where email is not null and email <> ''
order by lower(email), created_at asc
on conflict do nothing;

-- Link every existing lead to its contact by email.
update partner_requests pr
set contact_id = c.id
from contacts c
where pr.contact_id is null
  and pr.email is not null and pr.email <> ''
  and lower(pr.email) = lower(c.email);
