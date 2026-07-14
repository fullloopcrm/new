-- 057_freeze_tenants_domain.sql
-- P1 schema lane (W1). Write-freeze on the LEGACY tenants.domain column during
-- the tenant_domains routing cutover (043 -> 055 -> 056).
--
-- WHY: tenants.domain is intentionally NOT dropped this phase — it stays as the
-- resolver fallback (see 055 header / P1-SCHEMA-SPEC.md). But once tenant_domains
-- is the source of truth, any stray write to tenants.domain silently reintroduces
-- drift between the two. This trigger makes such a write fail loudly instead.
--
-- SCOPE: column-scoped to `domain` ONLY. The trigger inspects no other column and
-- fires for UPDATEs only when the domain column is in the SET list. It does not
-- touch resend_domain or any other *_domain column.
--
--   UPDATE: raises only when the domain value actually changes
--           (NEW.domain IS DISTINCT FROM OLD.domain — a no-op re-write passes).
--   INSERT: raises when a new tenant is created with a non-null domain, since
--           during the freeze window the legacy column must not be populated;
--           new domains belong in tenant_domains.
--
-- REVERSIBLE: 057_unfreeze_tenants_domain.sql drops both the trigger and the
-- function. Apply that once the cutover is done (or to make an intentional
-- correction to tenants.domain, then re-freeze).

create or replace function freeze_tenants_domain() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    if new.domain is not null then
      raise exception
        'tenants.domain is write-frozen during the tenant_domains cutover: refusing to INSERT a tenant with domain=%. Add the domain to tenant_domains instead, or run 057_unfreeze_tenants_domain.sql first.',
        new.domain;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.domain is distinct from old.domain then
      raise exception
        'tenants.domain is write-frozen during the tenant_domains cutover: refusing to change domain from % to %. Update tenant_domains instead, or run 057_unfreeze_tenants_domain.sql first.',
        old.domain, new.domain;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_freeze_tenants_domain on tenants;
create trigger trg_freeze_tenants_domain
  before insert or update of domain on tenants
  for each row execute function freeze_tenants_domain();
