-- ===========================================================================
-- 2026_07_04_seo_signal.sql
-- SIGNAL — global multi-tenant SEO engine. Phase 1 data spine.
--
-- ACCESS SCOPES (enforced at the app layer, not in these tables):
--   system        — the engine (cron + service account). Writes everything via
--                   supabaseAdmin (service role). RLS deny-all below means only
--                   the service role can touch these tables directly.
--   global        — one shared schema for ALL tenants (THE GLOBAL RULE). Tenants
--                   differ by the tenant_id column, never by forked tables.
--   fl admin      — reads EVERYTHING via /admin/seo routes (super-admin gated).
--   tenant admin  — reads WHERE tenant_id = <their tenant> via /dashboard/seo
--                   routes (getTenantForRequest), gated + flag-limited.
--
-- Every table: RLS enabled + deny-all policy, matching 046_rls_deny_on_new_tables.
-- Service role bypasses RLS; app routes scope access explicitly.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- seo_properties — one row per Search Console property the engine can read.
-- Auto-discovered via sites.list; tenant_id links it to a Full Loop tenant
-- (nullable — the main marketing site maps to no single tenant).
-- ---------------------------------------------------------------------------
create table if not exists seo_properties (
  id            uuid primary key default gen_random_uuid(),
  property      text not null unique,               -- e.g. 'sc-domain:thenycmaid.com'
  tenant_id     uuid references tenants(id) on delete set null,
  domain        text,                               -- 'thenycmaid.com'
  label         text,                               -- human label for the fleet grid
  enabled       boolean not null default true,
  permission    text,                               -- GSC permissionLevel, e.g. siteFullUser
  first_seen_at timestamptz not null default now(),
  last_ingest_at timestamptz,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists idx_seo_properties_tenant on seo_properties (tenant_id);

-- ---------------------------------------------------------------------------
-- seo_metrics — daily Search Analytics, per property × page × query × intent.
-- Rows are bounded by REAL traffic (GSC only returns rows with impressions),
-- not by the 25k-URL surface. page/query default '' so the unique index is
-- clean for idempotent upserts. intent is tagged post-ingest:
--   'customer'  — demand-side (leads)
--   'applicant' — supply-side (jobs / hiring)  ← dual-intent
--   'unknown'   — not yet classified
-- ---------------------------------------------------------------------------
create table if not exists seo_metrics (
  id          uuid primary key default gen_random_uuid(),
  property    text not null,
  date        date not null,
  page        text not null default '',
  query       text not null default '',
  intent      text not null default 'unknown',
  clicks      integer not null default 0,
  impressions integer not null default 0,
  ctr         numeric(6,5) not null default 0,
  position    numeric(6,2) not null default 0,
  captured_at timestamptz not null default now()
);
create unique index if not exists uq_seo_metrics_row
  on seo_metrics (property, date, page, query);
create index if not exists idx_seo_metrics_property_date on seo_metrics (property, date);
create index if not exists idx_seo_metrics_query on seo_metrics (property, query);
create index if not exists idx_seo_metrics_intent on seo_metrics (property, intent);

-- ---------------------------------------------------------------------------
-- seo_url_status — per-URL index health (URL Inspection API). Quota-budgeted,
-- so populated for changed pages + money pages + a rotating sample, not all URLs.
-- ---------------------------------------------------------------------------
create table if not exists seo_url_status (
  id             uuid primary key default gen_random_uuid(),
  property       text not null,
  url            text not null,
  index_status   text,          -- verdict: PASS / NEUTRAL / FAIL
  coverage_state text,          -- e.g. 'Submitted and indexed'
  robots_state   text,
  canonical      text,
  last_crawl_at  timestamptz,
  rich_results   jsonb not null default '{}'::jsonb,
  checked_at     timestamptz not null default now()
);
create unique index if not exists uq_seo_url_status on seo_url_status (property, url);
create index if not exists idx_seo_url_status_property on seo_url_status (property);

-- ---------------------------------------------------------------------------
-- seo_sitemaps — per-property sitemap health (Sitemaps API).
-- ---------------------------------------------------------------------------
create table if not exists seo_sitemaps (
  id             uuid primary key default gen_random_uuid(),
  property       text not null,
  sitemap_url    text not null,
  is_pending     boolean,
  errors         integer not null default 0,
  warnings       integer not null default 0,
  last_downloaded timestamptz,
  contents       jsonb not null default '{}'::jsonb,
  checked_at     timestamptz not null default now()
);
create unique index if not exists uq_seo_sitemaps on seo_sitemaps (property, sitemap_url);

-- ---------------------------------------------------------------------------
-- seo_vitals — Core Web Vitals per template/URL (PageSpeed / CrUX).
-- ---------------------------------------------------------------------------
create table if not exists seo_vitals (
  id          uuid primary key default gen_random_uuid(),
  property    text not null,
  url         text not null,
  form_factor text not null default 'PHONE',   -- PHONE / DESKTOP
  lcp         numeric,
  inp         numeric,
  cls         numeric,
  source      text not null default 'psi',      -- psi / crux
  checked_at  timestamptz not null default now()
);
create index if not exists idx_seo_vitals_property on seo_vitals (property);

-- ---------------------------------------------------------------------------
-- seo_issues — the diagnosis. One row per detected issue, typed + tiered.
-- recipe/tier map to the remediation catalog; status tracks the lifecycle.
-- ---------------------------------------------------------------------------
create table if not exists seo_issues (
  id          uuid primary key default gen_random_uuid(),
  property    text not null,
  tenant_id   uuid references tenants(id) on delete set null,
  type        text not null,        -- 'index_error' | 'sitemap_error' | 'thin' | 'underperformer' | 'schema' | 'cwv' | ...
  severity    text not null default 'medium',   -- low | medium | high | critical
  intent      text not null default 'unknown',  -- customer | applicant | unknown
  target_url  text,
  recipe      text,                 -- which fix recipe applies
  tier        smallint,             -- 0..3 risk tier
  status      text not null default 'open',     -- open | queued | fixing | verifying | resolved | rejected | wontfix
  detail      jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists idx_seo_issues_property_status on seo_issues (property, status);
create index if not exists idx_seo_issues_tenant on seo_issues (tenant_id);

-- ---------------------------------------------------------------------------
-- RLS — deny-all on every table (service role bypasses). App routes are the
-- only readers, and they scope by tenant per the access model above.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'seo_properties','seo_metrics','seo_url_status',
    'seo_sitemaps','seo_vitals','seo_issues'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "deny_all_%1$s" on %1$I', t);
    execute format(
      'create policy "deny_all_%1$s" on %1$I for all using (false) with check (false)', t
    );
  end loop;
end $$;

comment on table seo_properties is 'SIGNAL: GSC properties, auto-discovered via sites.list. tenant_id links to a Full Loop tenant.';
comment on table seo_metrics is 'SIGNAL: daily Search Analytics per page/query/intent (customer vs applicant). Bounded by real traffic.';
comment on table seo_issues is 'SIGNAL: detected SEO issues, typed + risk-tiered, driving the remediation loop.';
