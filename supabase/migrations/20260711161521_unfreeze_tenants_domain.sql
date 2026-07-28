-- Adopted from legacy hand-run migration: 057_unfreeze_tenants_domain.sql
-- Original commit date (git first-add): 2026-07-11T12:15:20-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- 057_unfreeze_tenants_domain.sql
-- Reverses 057_freeze_tenants_domain.sql: removes the write-freeze on
-- tenants.domain. Run this once the tenant_domains cutover is complete, or to
-- make an intentional correction to tenants.domain (then re-apply 057 freeze).
--
-- Order matters: drop the trigger before the function it depends on.

drop trigger if exists trg_freeze_tenants_domain on tenants;
drop function if exists freeze_tenants_domain();
