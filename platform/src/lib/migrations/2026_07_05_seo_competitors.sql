-- ===========================================================================
-- 2026_07_05_seo_competitors.sql
-- SIGNAL — competitor review. The first data the engine has that isn't
-- first-party GSC: live Google SERPs for the money keywords each property
-- already ranks for. Answers "who is above me, and where can I take the click?"
--
-- Same access model as the rest of SIGNAL: RLS deny-all, service role only,
-- global schema keyed by tenant_id. FL-admin reads via /admin/seo.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- seo_serp — one row per (property, query) scan. Stores our own position plus
-- the full top-N organic block, so detection + remediation can read the live
-- competitive landscape without re-hitting the SERP API. Dated so we can trend
-- movement over time; unique on (property, query, checked_at) for idempotency.
-- ---------------------------------------------------------------------------
create table if not exists seo_serp (
  id            uuid primary key default gen_random_uuid(),
  property      text not null,
  tenant_id     uuid references tenants(id) on delete set null,
  query         text not null,
  our_domain    text,                               -- the property's own domain
  our_position  numeric(6,2),                       -- our rank in this SERP (null = not in top-N)
  our_url       text,
  results       jsonb not null default '[]'::jsonb, -- [{position,domain,url,title,snippet}]
  commercial    text not null default 'commercial', -- transactional | commercial | informational
  impressions   integer not null default 0,         -- GSC demand for this query (value weight)
  checked_at    date not null default current_date,
  created_at    timestamptz not null default now()
);
create unique index if not exists uq_seo_serp on seo_serp (property, query, checked_at);
create index if not exists idx_seo_serp_property on seo_serp (property);
create index if not exists idx_seo_serp_tenant on seo_serp (tenant_id);

-- ---------------------------------------------------------------------------
-- seo_competitors — rollup of the domains that outrank a property across its
-- money-keyword set. This is the "who are my competitors" leaderboard, rebuilt
-- each scan. keywords_ahead = how many of our tracked queries they beat us on.
-- ---------------------------------------------------------------------------
create table if not exists seo_competitors (
  id                uuid primary key default gen_random_uuid(),
  property          text not null,
  tenant_id         uuid references tenants(id) on delete set null,
  competitor_domain text not null,
  keywords_ahead    integer not null default 0,     -- queries where they rank above us
  keywords_seen     integer not null default 0,     -- queries where they appear at all
  avg_position      numeric(6,2),
  best_position     numeric(6,2),
  is_directory      boolean not null default false, -- yelp/thumbtack/angi/etc — aggregator, not a peer
  sample_queries    jsonb not null default '[]'::jsonb,
  computed_at       timestamptz not null default now()
);
create unique index if not exists uq_seo_competitors on seo_competitors (property, competitor_domain);
create index if not exists idx_seo_competitors_property on seo_competitors (property);
create index if not exists idx_seo_competitors_tenant on seo_competitors (tenant_id);

-- ---------------------------------------------------------------------------
-- RLS — deny-all (service role bypasses), consistent with every SIGNAL table.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['seo_serp','seo_competitors']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "deny_all_%1$s" on %1$I', t);
    execute format(
      'create policy "deny_all_%1$s" on %1$I for all using (false) with check (false)', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- seo_competitor_summary — portfolio leaderboard for the /admin/seo panel.
-- Top real competitors (directories excluded) by total keywords_ahead.
-- ---------------------------------------------------------------------------
create or replace view seo_competitor_summary as
select
  competitor_domain,
  bool_or(is_directory)                      as is_directory,
  count(distinct property)                   as properties_hit,
  sum(keywords_ahead)                        as keywords_ahead,
  round(avg(avg_position), 1)                as avg_position,
  min(best_position)                         as best_position
from seo_competitors
group by competitor_domain
order by sum(keywords_ahead) desc;

-- ---------------------------------------------------------------------------
-- seo_money_keywords — the queries worth spending a SERP call on: high-demand,
-- and we already rank somewhere reachable (best position <= 30). Aggregated
-- over the last 90 days of GSC metrics. The app layer classifies commercial
-- intent and caps the count, so SERP spend stays bounded.
-- ---------------------------------------------------------------------------
create or replace function seo_money_keywords(p_property text, p_limit int default 60)
returns table(query text, impressions bigint, clicks bigint, best_position numeric, avg_position numeric)
language sql stable as $$
  select query,
         sum(impressions)::bigint  as impressions,
         sum(clicks)::bigint       as clicks,
         min(position)             as best_position,
         round(avg(position), 2)   as avg_position
  from seo_metrics
  where property = p_property
    and query <> ''
    and date >= current_date - 90
  group by query
  having min(position) <= 30 and sum(impressions) >= 20
  order by sum(impressions) desc
  limit p_limit;
$$;

-- ---------------------------------------------------------------------------
-- seo_run_detection — REPLACED so its open-issue reset only touches the GSC
-- types it owns. Without this scope, the daily GSC detect cron would delete the
-- competitor_gap issues the weekly SERP scan produces. Body is otherwise
-- identical to 2026_07_04_seo_detection_fn.sql.
-- ---------------------------------------------------------------------------
create or replace function seo_run_detection()
returns integer
language plpgsql
as $$
declare inserted integer;
begin
  delete from seo_issues
   where status = 'open'
     and type in ('striking_distance','low_ctr','deep_underperformer');

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

comment on table seo_serp is 'SIGNAL: live Google SERP snapshots for money keywords — the engine''s only competitor-facing data.';
comment on table seo_competitors is 'SIGNAL: per-property competitor leaderboard, rebuilt each SERP scan.';
