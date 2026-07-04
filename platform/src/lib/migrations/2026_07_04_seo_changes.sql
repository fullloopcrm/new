-- ===========================================================================
-- 2026_07_04_seo_changes.sql
-- SIGNAL Phase 3 — remediation ledger. One row per proposed/applied change.
-- The audit trail that makes auto-editing trustable: every change records its
-- before/after, rationale, tier, pipeline state, and measured outcome.
--
-- status lifecycle:
--   proposed -> approved -> applying -> applied -> verifying -> verified
--   (branches: rejected | failed | rolled_back)
-- Tier-1 auto-advances proposed->applied behind CI; Tier-2 pauses at approved.
-- ===========================================================================
create table if not exists seo_changes (
  id            uuid primary key default gen_random_uuid(),
  issue_id      uuid references seo_issues(id) on delete set null,
  property      text not null,
  tenant_id     uuid references tenants(id) on delete set null,
  target_url    text,
  recipe        text,                              -- title_meta | onpage_push | enrich | ...
  tier          smallint,
  field         text,                              -- title | meta_description | body | schema
  before_value  text,
  after_value   text,
  rationale     text,
  status        text not null default 'proposed',
  branch        text,
  pr_url        text,
  before_metric jsonb not null default '{}'::jsonb, -- snapshot at proposal time
  after_metric  jsonb not null default '{}'::jsonb, -- snapshot after verify window
  proposed_at   timestamptz not null default now(),
  applied_at    timestamptz,
  verified_at   timestamptz
);
create index if not exists idx_seo_changes_property_status on seo_changes (property, status);
create index if not exists idx_seo_changes_issue on seo_changes (issue_id);
create index if not exists idx_seo_changes_tenant on seo_changes (tenant_id);

alter table seo_changes enable row level security;
drop policy if exists "deny_all_seo_changes" on seo_changes;
create policy "deny_all_seo_changes" on seo_changes for all using (false) with check (false);

comment on table seo_changes is 'SIGNAL: remediation ledger — proposed/applied SEO changes with before/after + outcome.';
