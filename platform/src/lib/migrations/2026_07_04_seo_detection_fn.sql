drop view if exists seo_page_rollup;

create materialized view seo_page_rollup as
select
  a.property, a.page, a.impressions, a.clicks, a.ctr, a.avg_position, a.has_applicant, a.best_position,
  tq.query as top_query,
  tq.commercial as top_commercial
from (
  select
    property, page,
    sum(impressions)::bigint as impressions,
    sum(clicks)::bigint as clicks,
    case when sum(impressions)>0 then round(sum(clicks)::numeric/sum(impressions),4) else 0 end as ctr,
    case when sum(impressions)>0 then round(sum(position*impressions)/sum(impressions),1) else null end as avg_position,
    max(intent) filter (where intent='applicant') as has_applicant,
    min(position) as best_position
  from seo_metrics
  where page <> '' and date >= (current_date - interval '28 days')
  group by property, page
) a
left join lateral (
  select query, commercial
  from seo_metrics m
  where m.property = a.property and m.page = a.page and m.query <> ''
    and m.date >= (current_date - interval '28 days')
  order by impressions desc
  limit 1
) tq on true;

create index if not exists idx_seo_page_rollup_property on seo_page_rollup (property);

create or replace function seo_refresh_rollup()
returns void language sql as $$
  refresh materialized view seo_page_rollup;
$$;
create or replace function seo_run_detection()
returns integer
language plpgsql
as $$
declare inserted integer;
begin
  delete from seo_issues where status = 'open';

  insert into seo_issues (property, tenant_id, type, severity, intent, target_url, recipe, tier, status, detail)
  select property, tenant_id, type,
    case when value >= 600 then 'high' when value >= 150 then 'medium' else 'low' end,
    intent, page, recipe, tier, 'open',
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
    from seo_page_rollup r join seo_properties p on p.property = r.property
    where r.avg_position is not null and (r.best_position is null or r.best_position > 5)
  ) x
  where type is not null;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;
