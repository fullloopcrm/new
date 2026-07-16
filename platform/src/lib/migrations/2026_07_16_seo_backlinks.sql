-- ===========================================================================
-- 2026_07_16_seo_backlinks.sql
-- SIGNAL Phase 4 — backlink/citation proposal ledger (src/lib/seo/backlinks.ts).
--
-- One row per proposed citation-directory listing or editorial cross-mention
-- angle for a tenant. Nothing is ever submitted externally by this system —
-- status starts and (until a human/apply step acts) stays 'proposed'. This is
-- the deliberate, safer alternative to a literal hub-and-spoke backlink
-- scheme (see backlinks.ts header comment for why): real citations on
-- independently-operated directories, no reciprocal-link pattern.
--
-- status lifecycle:
--   proposed -> approved -> submitted -> live
--   (branches: rejected)
-- Every transition past 'proposed' is a human/manual action outside this repo
-- until a separately-gated apply step exists (mirrors seo_changes' pattern).
--
-- FILE-ONLY — not applied. Leader/Jeff runs this against prod after review.
-- ===========================================================================
create table if not exists seo_backlink_opportunities (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid references tenants(id) on delete set null,
  property     text not null,                      -- sc-domain:<tenant domain>, consistent with seo_issues/seo_changes
  kind         text not null,                       -- citation | editorial
  source_key   text not null,                       -- CITATION_SOURCES key, or editorial angle key
  source_name  text not null,
  source_url   text,                                -- null for editorial (no fixed external URL yet)
  category     text,                                -- IndustryKey
  status       text not null default 'proposed',
  listing      jsonb not null default '{}'::jsonb,  -- proposed NAP/description (citation) or hook/anchors (editorial)
  rationale    text,
  safety       jsonb not null default '{}'::jsonb,  -- evaluateBacklinkSafety() snapshot at proposal time
  proposed_at  timestamptz not null default now(),
  reviewed_at  timestamptz,
  submitted_at timestamptz
);
create index if not exists idx_seo_backlink_opportunities_tenant_status on seo_backlink_opportunities (tenant_id, status);
create index if not exists idx_seo_backlink_opportunities_tenant_kind on seo_backlink_opportunities (tenant_id, kind);
create unique index if not exists uq_seo_backlink_opportunities_tenant_source on seo_backlink_opportunities (tenant_id, source_key);

alter table seo_backlink_opportunities enable row level security;
drop policy if exists "deny_all_seo_backlink_opportunities" on seo_backlink_opportunities;
create policy "deny_all_seo_backlink_opportunities" on seo_backlink_opportunities for all using (false) with check (false);

comment on table seo_backlink_opportunities is 'SIGNAL: citation/editorial backlink proposal ledger — proposal-only, mirrors seo_changes. No external submission happens from this table.';
