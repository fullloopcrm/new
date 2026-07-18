-- 2026_07_18_seo_detection_status_gate.sql
--
-- BUG: seo_run_detection() (2026_07_04_seo_detection_fn.sql) reads
-- seo_page_rollup joined to seo_properties and rewrites the open
-- seo_issues queue for EVERY property with no tenant-status check at all --
-- the same gap this worker's session found and fixed across every other
-- seo-* pipeline stage (autopilot.ts, technical.ts, competitors.ts,
-- remediate.ts, competitor-remediate.ts, enrich.ts, backlinks.ts,
-- ingest.ts -- see src/lib/seo/tenant-gate.ts), but this one stage's
-- classification logic lives entirely in this DB-side function, not the app
-- layer, so the app-side nonServingTenantIds() filter never runs against it.
--
-- Left unfixed, a suspended/cancelled/deleted tenant's pages keep generating
-- fresh open seo_issues rows every detection run indefinitely. Those rows
-- feed remediate.ts/competitor-remediate.ts/enrich.ts's proposal generators
-- and autopilot.ts's apply step -- all three now skip non-serving tenants
-- via tenant-gate.ts, so this migration alone doesn't cause a new write for
-- a dead tenant. But it still wastes the function's own per-run cost
-- (re-deleting and re-inserting rows nobody downstream will ever act on) and
-- leaves a live count of "open issues" for a dead tenant sitting in the
-- database and any dashboard that reads seo_issues directly without going
-- through the app-layer filter.
--
-- Mirrors tenant-status.ts's NON_SERVING_STATUSES exactly ('suspended',
-- 'cancelled', 'deleted') -- fail-open for tenant_id is null (FL-owned /
-- not-yet-linked property, same as every app-layer gate this session added)
-- and for any status value outside the three excluded ones, so a new
-- tenant in 'setup'/'pending' keeps being detected same as today.
--
-- LEADER: run this after Jeff approves -- not executed by this worker. This
-- worker has not read every downstream consumer of seo_issues (dashboards,
-- reports) to confirm nothing outside the app-layer-filtered pipeline reads
-- open-issue counts for a dead tenant on purpose, so flagging for review
-- rather than assuming safe.

create or replace function seo_run_detection()
returns integer
language plpgsql
as $$
declare inserted integer;
begin
  delete from seo_issues where status = 'open';

  insert into seo_issues (property, tenant_id, type, severity, intent, target_url, recipe, tier, status, value, detail)
  select property, tenant_id, type,
    case when value >= 600 then 'high' when value >= 150 then 'medium' else 'low' end,
    intent, page, recipe, tier, 'open', value,
    jsonb_build_object('impressions',impressions,'clicks',clicks,'ctr',ctr,'position',avg_position,
      'best_position',best_position,'top_query',top_query,'top_commercial',commercial,'value',value)
  from (
    select r.property, p.tenant_id, r.page, r.impressions, r.clicks, r.ctr, r.avg_position, r.best_position, r.top_query,
      coalesce(r.top_commercial,'commercial') as commercial,
      r.impressions * (case coalesce(r.top_commercial,'commercial')
        when 'transactional' then 3 when 'commercial' then 2 else 1 end) as value,
      case when r.has_applicant is not null then 'applicant' else 'customer' end as intent,
      case when r.avg_position between 11 and 20 and r.impressions>=10 then 'striking_distance'
           when r.avg_position>5 and r.avg_position<=10 and r.ctr<0.03 and r.impressions>=20 then 'low_ctr'
           when r.avg_position>20 and r.impressions>=15 then 'deep_underperformer' end as type,
      case when r.avg_position between 11 and 20 and r.impressions>=10 then 'onpage_push'
           when r.avg_position>5 and r.avg_position<=10 and r.ctr<0.03 and r.impressions>=20 then 'title_meta'
           when r.avg_position>20 and r.impressions>=15 then 'enrich' end as recipe,
      case when r.avg_position between 11 and 20 and r.impressions>=10 then 1
           when r.avg_position>5 and r.avg_position<=10 and r.ctr<0.03 and r.impressions>=20 then 1
           when r.avg_position>20 and r.impressions>=15 then 2 end as tier
    from seo_page_rollup r
      join seo_properties p on p.property = r.property
      left join tenants t on t.id = p.tenant_id
    where r.avg_position is not null and (r.best_position is null or r.best_position > 5)
      and (t.id is null or t.status is null or t.status not in ('suspended', 'cancelled', 'deleted'))
  ) x
  where type is not null;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;
