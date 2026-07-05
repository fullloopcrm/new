-- ===========================================================================
-- 2026_07_05_seo_scoring.sql
-- SIGNAL — per-site scoreboard. Turns raw GSC metrics into a single grade per
-- property so a human can scan the whole fleet at a glance as tenant count grows.
--
-- Scored ONLY on money keywords (commercial/transactional intent, real demand),
-- demand-weighted — so a site isn't punished for junk long-tail averages. Goal
-- is top 3; partial credit for page 1 gives a useful gradient instead of a wall
-- of F's. All from data we already ingest — no SERP credits spent here.
--
-- This is also autopilot's objective function: the loop optimizes toward goal
-- (top 3 on money keywords) and the score is how measure-and-revert grades a change.
-- ===========================================================================
create or replace view seo_site_score as
with kw as (
  -- One row per money keyword per property: total demand, best rank, intent weight.
  select
    m.property,
    m.query,
    sum(m.impressions)                                                              as impr,
    min(m.position)                                                                 as best_pos,
    max(case m.commercial when 'transactional' then 3 when 'commercial' then 2 else 1 end) as w
  from seo_metrics m
  where m.query <> ''
    and m.commercial <> 'informational'
    and m.date >= current_date - 90
    and m.query !~* '^(site:|inurl:|intitle:)'
  group by m.property, m.query
  having sum(m.impressions) >= 20
),
scored as (
  select
    property,
    best_pos,
    (impr * w)                                                                      as weight,
    (impr * w) * (case
      when best_pos <= 3  then 1.0    -- at goal
      when best_pos <= 10 then 0.5    -- page 1, not yet goal
      when best_pos <= 20 then 0.2    -- page 2, striking distance
      else 0 end)                                                                   as credit
  from kw
)
select
  property,
  count(*)                                                as targets,
  count(*) filter (where best_pos <= 3)                   as at_goal,
  count(*) filter (where best_pos <= 10)                  as on_page1,
  round((100 * sum(credit) / nullif(sum(weight), 0))::numeric, 0)::int as score,
  case
    when 100 * sum(credit) / nullif(sum(weight), 0) >= 75 then 'A'
    when 100 * sum(credit) / nullif(sum(weight), 0) >= 55 then 'B'
    when 100 * sum(credit) / nullif(sum(weight), 0) >= 35 then 'C'
    when 100 * sum(credit) / nullif(sum(weight), 0) >= 15 then 'D'
    else 'F'
  end                                                     as grade
from scored
group by property;

comment on view seo_site_score is 'SIGNAL: per-property money-keyword grade (A–F) + demand-weighted score. Autopilot objective function.';
