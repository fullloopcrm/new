-- 2026_07_17_tenant_domains_single_primary.sql
--
-- BUG: POST /api/admin/websites let an admin mark a NEW domain as primary
-- without demoting the tenant's existing primary -- the table had no DB
-- constraint stopping two active is_primary=true rows from coexisting per
-- tenant, and nothing in the app enforced it either. Every "primary domain"
-- resolver (getPrimaryTenantDomain in domains.ts -- which feeds
-- tenantSiteUrl(), tenantBrand(), the SELENA agent's brand override, and
-- resolveOrigin(); plus referrers/[code], site-export, cron/tenant-health)
-- picked whichever row an unordered query happened to return first, so a
-- second live primary made which domain "wins" for invoice/quote/document
-- send links and SMS branding non-deterministic instead of just wrong.
--
-- App-side fix (demote-before-insert in admin/websites POST, plus
-- deterministic created_at ordering in getPrimaryTenantDomain as
-- defense-in-depth) lands alongside this migration. This adds the DB-level
-- guarantee so a future bug can't reintroduce the same failure mode silently.
--
-- LEADER: run this after Jeff approves -- not executed by the worker.

-- Step 1: deduplicate first, or the unique index below fails to create.
-- For any tenant with more than one active is_primary row, keep the OLDEST
-- (matches the new deterministic ordering added to getPrimaryTenantDomain)
-- and demote the rest.
with ranked as (
  select id, tenant_id,
         row_number() over (partition by tenant_id order by created_at asc) as rn
  from tenant_domains
  where is_primary = true and active = true
)
update tenant_domains
set is_primary = false
where id in (select id from ranked where rn > 1);

-- Step 2: enforce it going forward. Partial index (not a full unique
-- constraint on is_primary) because is_primary=true rows that are
-- active=false are inert everywhere they're read -- every "primary domain"
-- resolver already filters .eq('active', true) -- so they shouldn't block a
-- new active primary from being created.
create unique index if not exists idx_tenant_domains_single_primary
  on tenant_domains (tenant_id)
  where is_primary and active;
