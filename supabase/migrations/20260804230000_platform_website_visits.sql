-- Traffic on Full Loop's OWN marketing site (homeservicesbusinesscrm.com /
-- fullloopcrm.com), not any tenant's site — website_visits is tenant-scoped
-- (tenant_id NOT NULL) and exists to track tenants' own public sites, wrong
-- table for this. Minimal columns for a first pass: page views, sessions,
-- top pages, referrers, UTM — not the full CTA/scroll-depth/conversion
-- feature set website_visits has, which is disproportionate for this slice.
create table if not exists platform_website_visits (
  id uuid primary key default gen_random_uuid(),
  page_url text,
  referrer text,
  device text,
  session_id text,
  visitor_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now()
);

create index if not exists platform_website_visits_created_at_idx on platform_website_visits (created_at desc);
create index if not exists platform_website_visits_session_id_idx on platform_website_visits (session_id);

alter table platform_website_visits enable row level security;
