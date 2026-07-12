-- 057_unfreeze_tenants_domain.sql
-- Reverses 057_freeze_tenants_domain.sql: removes the write-freeze on
-- tenants.domain. Run this once the tenant_domains cutover is complete, or to
-- make an intentional correction to tenants.domain (then re-apply 057 freeze).
--
-- Order matters: drop the trigger before the function it depends on.

drop trigger if exists trg_freeze_tenants_domain on tenants;
drop function if exists freeze_tenants_domain();
