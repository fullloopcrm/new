-- Owner-phone backfill (2026-07-11)  [P1-1]
--
-- WHY: The per-tenant owner-identity fix (commit 017043f, isOwnerOfTenant)
-- makes a phone an owner of tenant T *iff* it matches T's own
-- tenants.owner_phone. The legacy OWNER_PHONES env is honored ONLY for the
-- nycmaid tenant. That fix is FAIL-CLOSED: any non-nycmaid tenant whose
-- owner_phone is NULL/blank locks its real owner OUT of owner-only tooling.
-- This backfill populates owner_phone for existing tenants so the fix does
-- not lock owners out when it lands.
--
-- SOURCE OF TRUTH (best available, derived — nothing hardcoded), in priority:
--   1. tenants.owner_phone            -- already set: never overwritten
--   2. tenant_members(role='owner')   -- the owner user record's personal phone
--   3. tenants.phone                  -- the business/owner contact number
-- We deliberately DO NOT use tenants.sms_number / telnyx_phone: those are the
-- system's OUTBOUND numbers, never the owner's personal cell.
--
-- SCOPE: excludes nycmaid (well-known UUID + slug) — its owner access is
-- preserved by the legacy OWNER_PHONES env, per the 017043f design.
--
-- IDEMPOTENT: only fills rows where owner_phone is currently NULL/blank, and
-- never writes NULL (a tenant with no derivable phone is left untouched and
-- reported by the diagnostic SELECT at the bottom).
--
-- Owner-identity matching normalizes to the last 10 digits at read time
-- (agent.ts: phone.replace(/\D/g,'').slice(-10)), so the raw source value is
-- stored as-is here — no reformatting required.

BEGIN;

UPDATE tenants t
SET owner_phone = COALESCE(
      (SELECT NULLIF(btrim(tm.phone), '')
         FROM tenant_members tm
        WHERE tm.tenant_id = t.id
          AND tm.role = 'owner'
          AND NULLIF(btrim(tm.phone), '') IS NOT NULL
        ORDER BY tm.phone
        LIMIT 1),
      NULLIF(btrim(t.phone), '')
    )
WHERE NULLIF(btrim(t.owner_phone), '') IS NULL           -- only fill blanks (idempotent)
  AND t.id <> '00000000-0000-0000-0000-000000000001'::uuid   -- exclude nycmaid (UUID)
  AND t.slug IS DISTINCT FROM 'nycmaid'                       -- exclude nycmaid (slug)
  AND COALESCE(                                                -- never write NULL
      (SELECT NULLIF(btrim(tm.phone), '')
         FROM tenant_members tm
        WHERE tm.tenant_id = t.id
          AND tm.role = 'owner'
          AND NULLIF(btrim(tm.phone), '') IS NOT NULL
        ORDER BY tm.phone
        LIMIT 1),
      NULLIF(btrim(t.phone), '')
    ) IS NOT NULL;

COMMIT;

-- DIAGNOSTIC — tenants that STILL have no owner_phone after the backfill
-- (no owner-member phone and no business phone). These owners will be locked
-- out of owner-only tooling until a phone is supplied. Review before relying
-- on the 017043f fix in production.
SELECT t.id, t.slug, t.name, t.industry
FROM tenants t
WHERE NULLIF(btrim(t.owner_phone), '') IS NULL
  AND t.id <> '00000000-0000-0000-0000-000000000001'::uuid
  AND t.slug IS DISTINCT FROM 'nycmaid'
ORDER BY t.name;
