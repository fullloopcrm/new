-- 044_legacy_seo_gate.sql
-- Gate the 30+ nycmaid-specific SEO pages behind a tenant flag so new
-- tenants (test or real) don't render "The NYC Maid" content on their
-- own customer site. Nycmaid gets the flag flipped on; all other
-- tenants default to false and those pages 404 for them.
--
-- Long-term: move the content itself into tenant-scoped tables. This
-- flag is a transitional gate so the platform can onboard tenants today
-- without shipping nycmaid copy to everyone.

alter table tenants
  add column if not exists enable_legacy_seo_pages boolean not null default false;

comment on column tenants.enable_legacy_seo_pages is
  'When true, renders the hardcoded nycmaid SEO pages (about, FAQ, neighborhood pages, blog, etc). Default false so new tenants see a clean shell. Seeded true only for the-nyc-maid.';

update tenants
  set enable_legacy_seo_pages = true
  where slug = 'the-nyc-maid';
