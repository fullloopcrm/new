-- 068_tenant_domains_type_geo.sql
-- P1 schema lane (W1). Adds the `type` / `neighborhood` / `zip_codes` columns
-- to tenant_domains that src/lib/domains.ts and src/lib/attribution.ts have
-- assumed exist since their inception, but no migration ever created.
--
-- ROOT BUG (found during the P1 refill loop): src/lib/domains.ts's
-- `TenantDomain` interface declares `type: 'primary' | 'neighborhood' |
-- 'generic'`, and getTenantDomains() does `.order('type', ...)`;
-- getDomainsForNeighborhood()/getNeighborhoodFromZip() filter on
-- `neighborhood` / `zip_codes`. None of the three columns exist on the real
-- table (only `is_primary` boolean does — see 043_tenant_domains.sql). Every
-- one of those queries has therefore always errored server-side and returned
-- an empty/null result, which the calling code swallows silently. The
-- concrete blast radius: src/lib/attribution.ts's attributeByAddress() —
-- wired into the LIVE /api/portal/collect, /api/client/collect, and
-- /api/client/book routes — has NEVER produced a single attribution match for
-- ANY tenant since inception (getTenantDomains() always returning [] means
-- even the plain, no-neighborhood "generic domain" match path was
-- unreachable). Fixed here at the schema layer; the attribution.ts logic gap
-- (hard-requiring a neighborhood match before generic fallback) is fixed
-- separately in the same commit.
--
-- NULLABLE-FIRST, same discipline as 055/056: this file only adds the
-- columns; 068's backfill file populates every existing row; a 069 enforce
-- step applies NOT NULL/default only where a deterministic backfill exists.
--
-- RUN ORDER:
--   1. 068_tenant_domains_type_geo.sql          <-- this file (add nullable)
--   2. 068_tenant_domains_type_geo.backfill.sql <-- populate every existing row
--   3. 069_tenant_domains_type_geo_enforce.sql  <-- NOT NULL + default for `type`

-- type: which "kind" of domain this row is, mirroring the interface
-- src/lib/domains.ts has always assumed. Not the same axis as is_primary
-- (a neighborhood domain can be a tenant's ONLY domain and thus is_primary,
-- while still being `type = 'neighborhood'`). Added WITHOUT a default: the
-- backfill derives it from the existing is_primary boolean so no row is
-- silently mis-typed. CHECK passes on NULL, so it is safe pre-backfill.
alter table tenant_domains
  add column if not exists type text;

alter table tenant_domains
  drop constraint if exists tenant_domains_type_check;
alter table tenant_domains
  add constraint tenant_domains_type_check
  check (type in ('primary', 'neighborhood', 'generic'));

-- neighborhood / zip_codes: the geo-attribution keys getDomainsForNeighborhood()
-- and getNeighborhoodFromZip() query. No existing column or table in this repo
-- holds a zip->neighborhood->domain mapping for arbitrary tenants (the only
-- working implementation is a hardcoded per-tenant map in
-- src/app/site/wash-and-fold-{nyc,hoboken}/_lib/attribution.ts, out of this
-- migration's reach). Left NULL with NO backfill and NO NOT NULL step — there
-- is no source of truth to populate them from, same honesty the 059 backfill
-- applied to the 18 undeterminable bespoke vercel_project rows. A future pass
-- that actually owns the neighborhood/zip data (admin UI or a data import) is
-- what populates these; until then they are correctly empty rather than
-- fabricated.
alter table tenant_domains
  add column if not exists neighborhood text;
alter table tenant_domains
  add column if not exists zip_codes text[];

comment on column tenant_domains.type is
  'primary | neighborhood | generic — domain kind read by src/lib/domains.ts + src/lib/attribution.ts for lead/booking attribution. Independent of is_primary (a neighborhood domain can also be a tenant''s sole/primary domain).';
comment on column tenant_domains.neighborhood is
  'Neighborhood this domain is dedicated to, for zip-based lead attribution (src/lib/attribution.ts). NULL for generic/non-neighborhood domains; no backfill source exists yet.';
comment on column tenant_domains.zip_codes is
  'Zip codes routed to this neighborhood domain for lead attribution. NULL/empty for generic domains; no backfill source exists yet.';
