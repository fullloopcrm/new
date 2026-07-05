-- 2026_07_05_service_area_geo.sql
-- Phase 1 of tenant-site personalization: the data model for geo/service/job
-- page generation. All additive + nullable — safe to run on live prod, no
-- backfill required. Downstream page generation keys off distance from the
-- service-area center, so these are the base every generated page depends on.
--
--   service_radius_miles — how far from the business address the tenant serves.
--                          Drives which neighborhoods/cities get geo + job pages.
--   service_area_lat/lng — geocoded center of the service area (from the business
--                          address). Distance to each candidate locality is
--                          measured from here.
--
-- service_areas themselves continue to live in tenants.selena_config.service_areas
-- (already seeded by provisionTenant); this table adds the numeric geo spine.

alter table tenants
  add column if not exists service_radius_miles integer,
  add column if not exists service_area_lat double precision,
  add column if not exists service_area_lng double precision;

comment on column tenants.service_radius_miles is
  'Service radius in miles from the business address. Drives geo/job page generation coverage.';
comment on column tenants.service_area_lat is
  'Geocoded latitude of the service-area center (business address). Distance base for generated geo pages.';
comment on column tenants.service_area_lng is
  'Geocoded longitude of the service-area center (business address). Distance base for generated geo pages.';
