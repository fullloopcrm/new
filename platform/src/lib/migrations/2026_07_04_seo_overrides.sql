-- ===========================================================================
-- 2026_07_04_seo_overrides.sql
-- SIGNAL apply layer. The template-page problem, solved: instead of editing the
-- one template that renders 20k combos (huge blast radius), a fix is a DATA row
-- keyed by URL. generateMetadata reads the override first, falls back to the
-- template. Applying = upsert; reverting = set active=false. No code, no deploy.
-- ===========================================================================
create table if not exists seo_overrides (
  id          uuid primary key default gen_random_uuid(),
  url         text not null unique,
  title       text,
  description text,
  active      boolean not null default true,
  source      text not null default 'signal',   -- signal | human
  change_id   uuid references seo_changes(id) on delete set null,
  updated_at  timestamptz not null default now()
);
create index if not exists idx_seo_overrides_active on seo_overrides (active);

alter table seo_overrides enable row level security;
drop policy if exists "deny_all_seo_overrides" on seo_overrides;
create policy "deny_all_seo_overrides" on seo_overrides for all using (false) with check (false);

comment on table seo_overrides is 'SIGNAL: per-URL title/meta overrides read by generateMetadata. The apply layer for template pages.';
