-- Owner-phone backfill (2026-07-11)  [P1-1]
--
-- WHY: The per-tenant owner-identity fix (commit 017043fa, agent.ts
-- `isOwner` -> `isOwnerOfTenant`) makes a phone an owner of tenant T *iff* it
-- matches T's own tenants.owner_phone. The legacy global OWNER_PHONES env is
-- honored ONLY for the nycmaid tenant. That fix is FAIL-CLOSED: any non-nycmaid
-- tenant whose owner_phone is NULL/blank locks its real owner OUT of owner-only
-- tooling. This backfill populates owner_phone for existing tenants so the fix
-- does not lock owners out when it lands. (Owner match normalizes to the last 10
-- digits at read time — isOwner in agent.ts:176-177: phone.replace(/\D/g,'').slice(-10)
-- — so raw source values are stored as-is here; no reformatting needed.)
--
-- >>> KNOWN, UNFIXABLE-FROM-SQL LIMITATION (W4 audit O-1) <<<
-- The tenant_members.phone column exists (schema.sql:76) but is EMPTY for most
-- tenants in prod: the owner-creating paths (join flow, provisioning) never write
-- it; only the two admin user-create endpoints
-- (src/app/api/admin/{businesses/[id]/users,users}/route.ts) set it. So the
-- tenant_members source below fills very few rows, and most tenants fall through
-- to weaker sources — and any tenant with NONE end up NULL = owner lockout. There
-- is no phone data to invent for those. This backfill therefore does two things:
--   (1) pulls from EVERY real owner-phone source that exists in the schema, in
--       trust order, to maximize coverage; and
--   (2) emits an explicit BLOCKING list (final SELECT) of every owner that will
--       still be locked out, for a human to populate before the 017043fa fix is
--       relied upon in prod.
--
-- SOURCES OF TRUTH (best available, derived — nothing hardcoded), in priority.
-- Columns RE-VERIFIED to exist:
--   1. tenants.owner_phone           already set: NEVER overwritten   (admin-business-management.sql)
--   2. tenant_members(role='owner')  the owner USER record's phone     (schema.sql:76)
--   3. leads(converted_tenant_id)    phone the OWNER gave at signup    (leads-table.sql: phone + converted_tenant_id)
--   4. tenants.phone                 the business/owner contact number (schema.sql:6)
-- Ordering rationale: (2) is the owner's own user record; (3) is the personal
-- phone the owner submitted on the signup/demo request that became this tenant
-- (owner-personal, so it beats a possibly-shared business mainline); (4) is the
-- business number — weakest but still the owner for most solo operators.
--
-- DELIBERATELY EXCLUDED sources:
--   - tenants.telnyx_phone / sms_number : the system's OUTBOUND numbers, never a person.
--   - tenants.apple_cash_phone          : a PAYMENT number. It may be the owner's
--       cell OR a shared/business Apple Cash line. owner_phone GATES owner-only
--       tooling (fail-closed identity), so seeding it from a number that might not
--       be the owner's would risk granting owner access to the wrong phone. A
--       false NEGATIVE (lockout, caught by the blocking list) is safe; a false
--       POSITIVE (wrong owner) is a privilege escalation. Excluded on purpose.
--   - tenant_members with role='admin' : an admin is not the owner; using an
--       admin's phone would grant them owner identity. role='owner' only.
--
-- IDEMPOTENT: every step fills ONLY rows where owner_phone is currently NULL/blank
-- and each step's own source is non-NULL, so no step ever writes NULL and a
-- re-run is a no-op. Steps run highest-priority first; each later step only sees
-- rows the earlier ones could not fill.
--
-- SCOPE: excludes nycmaid (well-known UUID + slug) — its owner access is preserved
-- by the legacy OWNER_PHONES env, per the 017043fa design.

BEGIN;

-- STEP 1 (priority 2) — owner USER record's phone.
UPDATE tenants t
SET owner_phone = (
      SELECT NULLIF(btrim(tm.phone), '')
        FROM tenant_members tm
       WHERE tm.tenant_id = t.id
         AND tm.role = 'owner'
         AND NULLIF(btrim(tm.phone), '') IS NOT NULL
       ORDER BY tm.phone
       LIMIT 1)
WHERE NULLIF(btrim(t.owner_phone), '') IS NULL
  AND t.id <> '00000000-0000-0000-0000-000000000001'::uuid
  AND t.slug IS DISTINCT FROM 'nycmaid'
  AND EXISTS (
      SELECT 1 FROM tenant_members tm
       WHERE tm.tenant_id = t.id
         AND tm.role = 'owner'
         AND NULLIF(btrim(tm.phone), '') IS NOT NULL);

-- STEP 2 (priority 3) — phone the owner supplied on the lead/demo request that
-- converted into this tenant. Guarded: the `leads` table (and its phone /
-- converted_tenant_id columns) may not exist in every environment, so run this
-- fill only when they do — a missing table must not abort the whole backfill.
DO $$
BEGIN
  IF to_regclass('public.leads') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'leads'
                    AND column_name = 'phone')
     AND EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'leads'
                    AND column_name = 'converted_tenant_id')
  THEN
    EXECUTE $sql$
      UPDATE tenants t
      SET owner_phone = (
            SELECT NULLIF(btrim(l.phone), '')
              FROM leads l
             WHERE l.converted_tenant_id = t.id
               AND NULLIF(btrim(l.phone), '') IS NOT NULL
             ORDER BY l.created_at DESC NULLS LAST
             LIMIT 1)
      WHERE NULLIF(btrim(t.owner_phone), '') IS NULL
        AND t.id <> '00000000-0000-0000-0000-000000000001'::uuid
        AND t.slug IS DISTINCT FROM 'nycmaid'
        AND EXISTS (
            SELECT 1 FROM leads l
             WHERE l.converted_tenant_id = t.id
               AND NULLIF(btrim(l.phone), '') IS NOT NULL)
    $sql$;
  END IF;
END $$;

-- STEP 3 (priority 4) — business/owner contact number (weakest, last resort).
UPDATE tenants t
SET owner_phone = NULLIF(btrim(t.phone), '')
WHERE NULLIF(btrim(t.owner_phone), '') IS NULL
  AND t.id <> '00000000-0000-0000-0000-000000000001'::uuid
  AND t.slug IS DISTINCT FROM 'nycmaid'
  AND NULLIF(btrim(t.phone), '') IS NOT NULL;

COMMIT;

-- ============================================================================
-- >>> BLOCKING LIST — READ BEFORE RELYING ON THE 017043fa OWNER CHECK IN PROD <<<
-- Every tenant below STILL has no owner_phone after the backfill (no owner-member
-- phone, no converted-lead phone, no business phone). Under the fail-closed
-- per-tenant owner check, THE OWNER OF EACH OF THESE TENANTS WILL BE LOCKED OUT of
-- owner-only tooling until a phone is populated. There is no derivable source for
-- them — a human must supply owner_phone (owner_name / owner_email are included to
-- help identify who to contact). This is a release blocker, not an FYI.
-- ============================================================================
SELECT t.id, t.slug, t.name, t.industry, t.owner_name, t.owner_email, t.phone AS business_phone
FROM tenants t
WHERE NULLIF(btrim(t.owner_phone), '') IS NULL
  AND t.id <> '00000000-0000-0000-0000-000000000001'::uuid
  AND t.slug IS DISTINCT FROM 'nycmaid'
ORDER BY t.name;
