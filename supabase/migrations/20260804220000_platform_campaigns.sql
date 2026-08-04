-- Full Loop's OWN outbound email to its actual audience: tenants (not
-- tenant clients — that's dashboard/campaigns, a completely separate
-- tenant-scoped table). Mirrors campaigns' shape (subject/body/status/
-- recipient targeting/counts) but targets `tenants` rows directly. Email
-- only for v1 — tenants are businesses reached at their owner email, not an
-- SMS audience the way a tenant's own consumer clients are.
create table if not exists platform_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'sent')),
  recipient_filter text not null default 'all_tenants' check (recipient_filter in (
    'all_tenants', 'active_tenants', 'setup_tenants', 'suspended_tenants'
  )),
  recipient_count integer,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists platform_campaigns_status_idx on platform_campaigns (status);

alter table platform_campaigns enable row level security;
