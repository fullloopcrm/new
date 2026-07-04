alter table seo_issues add column if not exists value integer default 0;
create index if not exists idx_seo_issues_value on seo_issues (value desc);

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
    from seo_page_rollup r join seo_properties p on p.property = r.property
    where r.avg_position is not null and (r.best_position is null or r.best_position > 5)
  ) x
  where type is not null;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

select seo_run_detection() as inserted;
