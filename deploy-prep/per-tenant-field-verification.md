# Per-Tenant Field Verification — read-only audit plan

**Author:** W1 (schema + backfill lane) · **Date:** 2026-07-12 · **Status:** FILE ONLY — read-only. W1 ran no DB command to author this. Every query below is a `SELECT` (the optional gate at the end is a RAISE-only `DO` block that writes NOTHING). Safe for the leader to run against prod any number of times, before or after the migrations.

**Goal:** confirm, per tenant, that the four Part-0 routing/identity fields hold the value the migrations + backfills intended:

| Field | Lives in | Set by | Nullable after Part-0? |
|---|---|---|---|
| `routing_mode` | `tenant_domains` | 055 backfill + 061 reconcile | **No** (056 `NOT NULL`, default `'template'`) |
| `vercel_project` | `tenant_domains` | 055 blanket → 059 real fill | **Yes, by design** (056 leaves it nullable) |
| `status` | `tenant_domains` | 055 backfill | **No** (056 `NOT NULL`, default `'active'`) |
| `owner_phone` | `tenants` | `2026_07_11_owner_phone_backfill.sql` | Yes in schema; **must be populated for active non-flagship tenants** |

Run everything with: `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f per-tenant-field-verification.md` — but note this is a **plan document**, not a migration file; copy the sections you want into psql, or the leader can lift the `\echo`/`SELECT` blocks verbatim.

---

## 0. Expected-value contract (how each field's "expected" is derived)

These are the source-of-truth rules the backfills implement; the audit queries below encode them so "expected" is reproducible, not asserted.

- **`routing_mode` = `'bespoke'`** iff the tenant's `slug` is in the bespoke set below (copied verbatim from `055_tenant_domains_routing.backfill.sql`, which mirrors `src/middleware.ts` `BESPOKE_SITE_TENANTS`), **else `'template'`**. The flagship is additionally forced `'bespoke'` on **every** domain row by `061`, slug-agnostically (`nycmaid`/`the-nyc-maid`).
- **`status` = `'active'`** when the row's legacy `active` boolean is true, **else `'archived'`**. `'pending'` is not produced by the backfill (reserved for future onboarding writes).
- **`vercel_project`**: the FL project id `prj_PtBsLFfrCvSYXzo60GlNAjPoPjbj` for all **determinable** rows (every template tenant + the 4 FL-signal bespoke tenants: `the-florida-maid`, `consortium-nyc`, `the-nyc-interior-designer`, `the-nyc-marketing-company`); **`NULL` is expected** for the 18 unknown-bespoke tenants (resolved later via live Vercel API). A NULL here is **not** a defect.
- **`owner_phone`**: populated (`NULLIF(btrim(owner_phone),'') IS NOT NULL`) for every **active, non-flagship** tenant. NULL is **by design** for the flagship (`nycmaid`/`the-nyc-maid`) and the seed tenant `00000000-0000-0000-0000-000000000001`; NULL for a **non-active** tenant is informational, not a blocker.

The bespoke slug set (single source for the audit — keep in sync with the 055 backfill):
```
nycmaid, we-pay-you-junk, nyc-mobile-salon, the-florida-maid, the-nyc-exterminator,
nyc-tow, nycroadsideemergencyassistance, theroadsidehelper, toll-trucks-near-me,
sunnyside-clean-nyc, wash-and-fold-nyc, wash-and-fold-hoboken, landscaping-in-nyc,
debt-service-ratio-loan, fla-dumpster-rentals, stretch-ny, stretch-service,
the-home-services-company, the-nyc-interior-designer, the-nyc-marketing-company,
the-nyc-seo, consortium-nyc
```

---

## 1. Master per-tenant report (all four fields, one row per domain)

Joins `tenants` → `tenant_domains` and computes the expected value for each field inline, flagging any mismatch. `LEFT JOIN` so a tenant with **no** `tenant_domains` row still appears (a coverage gap — see the `NO_DOMAIN_ROW` marker).

```sql
\echo '== Master per-tenant field report (scan the *_ok columns for FALSE / MISMATCH) =='
with bespoke(slug) as (
  values ('nycmaid'),('we-pay-you-junk'),('nyc-mobile-salon'),('the-florida-maid'),
         ('the-nyc-exterminator'),('nyc-tow'),('nycroadsideemergencyassistance'),
         ('theroadsidehelper'),('toll-trucks-near-me'),('sunnyside-clean-nyc'),
         ('wash-and-fold-nyc'),('wash-and-fold-hoboken'),('landscaping-in-nyc'),
         ('debt-service-ratio-loan'),('fla-dumpster-rentals'),('stretch-ny'),
         ('stretch-service'),('the-home-services-company'),('the-nyc-interior-designer'),
         ('the-nyc-marketing-company'),('the-nyc-seo'),('consortium-nyc')
),
fl_determinable(slug) as (   -- template tenants + 4 FL-signal bespoke tenants
  values ('the-florida-maid'),('consortium-nyc'),
         ('the-nyc-interior-designer'),('the-nyc-marketing-company')
)
select
  t.slug,
  t.status                                   as tenant_status,
  td.domain,
  -- routing_mode
  td.routing_mode,
  case when t.slug in (select slug from bespoke) then 'bespoke' else 'template' end
                                             as routing_mode_expected,
  (td.routing_mode = case when t.slug in (select slug from bespoke)
                          then 'bespoke' else 'template' end)          as routing_mode_ok,
  -- status
  td.status,
  case when td.active then 'active' else 'archived' end               as status_expected_from_active,
  (td.status = case when td.active then 'active' else 'archived' end)  as status_ok,
  -- vercel_project (NULL is expected for unknown-bespoke)
  td.vercel_project,
  case
    when t.slug not in (select slug from bespoke)
         or t.slug in (select slug from fl_determinable)
      then 'FL id prj_PtBsLFfrCvSYXzo60GlNAjPoPjbj'
    else 'NULL (unknown-bespoke — resolve via live Vercel API)'
  end                                        as vercel_project_expected,
  -- owner_phone (tenant-level; repeats per domain row)
  nullif(btrim(t.owner_phone), '') is not null                        as owner_phone_present,
  case
    when t.status = 'active'
     and t.id <> '00000000-0000-0000-0000-000000000001'::uuid
     and t.slug not in ('nycmaid','the-nyc-maid')
    then 'REQUIRED' else 'optional/by-design-null'
  end                                        as owner_phone_requirement
from tenants t
left join tenant_domains td on td.tenant_id = t.id
order by owner_phone_requirement desc, t.slug, td.domain;
```
**Expected:** `routing_mode_ok` and `status_ok` are `TRUE` (or `NULL` only where a row lacks the field pre-056); no `owner_phone_requirement = 'REQUIRED'` row with `owner_phone_present = FALSE`; `vercel_project` NULL **only** for the unknown-bespoke slugs.

---

## 2. `routing_mode` — mismatches only (expect ZERO rows)

```sql
\echo '== routing_mode mismatches (expect 0 rows) =='
with bespoke(slug) as (
  values ('nycmaid'),('we-pay-you-junk'),('nyc-mobile-salon'),('the-florida-maid'),
         ('the-nyc-exterminator'),('nyc-tow'),('nycroadsideemergencyassistance'),
         ('theroadsidehelper'),('toll-trucks-near-me'),('sunnyside-clean-nyc'),
         ('wash-and-fold-nyc'),('wash-and-fold-hoboken'),('landscaping-in-nyc'),
         ('debt-service-ratio-loan'),('fla-dumpster-rentals'),('stretch-ny'),
         ('stretch-service'),('the-home-services-company'),('the-nyc-interior-designer'),
         ('the-nyc-marketing-company'),('the-nyc-seo'),('consortium-nyc')
)
select t.slug, td.domain, td.routing_mode,
       case when t.slug in (select slug from bespoke) then 'bespoke' else 'template' end as expected
  from tenants t
  join tenant_domains td on td.tenant_id = t.id
 where td.routing_mode is distinct from
       case when t.slug in (select slug from bespoke) then 'bespoke' else 'template' end
 order by t.slug, td.domain;
```
> Exception to eyeball, not fail on: the flagship. If the real slug is `the-nyc-maid` (not in the bespoke list), the 055 backfill would compute `'template'` for it, but `061` then forces `'bespoke'` — so a flagship row showing `'bespoke'` against an `expected='template'` here is **correct** (061 wins). Confirm any flagship hit is exactly that case.

Also flag any NULL after enforcement (056 should make this impossible):
```sql
\echo '== routing_mode / status NULLs after 056 (expect 0 rows) =='
select id, tenant_id, domain, routing_mode, status
  from tenant_domains
 where routing_mode is null or status is null;
```

---

## 3. `status` — distribution + non-'active/archived' values

```sql
\echo '== status distribution (expect only active / archived from backfill; pending only from later writes) =='
select status, count(*) from tenant_domains group by status order by status;

\echo '== status disagreeing with the legacy active flag (expect 0 rows; a pending row is an allowed later write) =='
select t.slug, td.domain, td.active, td.status
  from tenants t
  join tenant_domains td on td.tenant_id = t.id
 where td.status <> case when td.active then 'active' else 'archived' end
   and td.status <> 'pending'
 order by t.slug, td.domain;
```

---

## 4. `vercel_project` — determinable set vs unknown-bespoke NULLs

```sql
\echo '== vercel_project audit (FL id where determinable; NULL only for the 18 unknown-bespoke) =='
with bespoke(slug) as (
  values ('nycmaid'),('we-pay-you-junk'),('nyc-mobile-salon'),('the-florida-maid'),
         ('the-nyc-exterminator'),('nyc-tow'),('nycroadsideemergencyassistance'),
         ('theroadsidehelper'),('toll-trucks-near-me'),('sunnyside-clean-nyc'),
         ('wash-and-fold-nyc'),('wash-and-fold-hoboken'),('landscaping-in-nyc'),
         ('debt-service-ratio-loan'),('fla-dumpster-rentals'),('stretch-ny'),
         ('stretch-service'),('the-home-services-company'),('the-nyc-interior-designer'),
         ('the-nyc-marketing-company'),('the-nyc-seo'),('consortium-nyc')
),
fl_determinable(slug) as (
  values ('the-florida-maid'),('consortium-nyc'),
         ('the-nyc-interior-designer'),('the-nyc-marketing-company')
)
select t.slug, td.domain, td.vercel_project,
       case
         when t.slug not in (select slug from bespoke)
              or t.slug in (select slug from fl_determinable) then 'FL_ID_EXPECTED'
         else 'NULL_EXPECTED'
       end as expectation,
       case
         when (t.slug not in (select slug from bespoke)
               or t.slug in (select slug from fl_determinable))
              and td.vercel_project is distinct from 'prj_PtBsLFfrCvSYXzo60GlNAjPoPjbj'
           then 'MISMATCH: expected FL id'
         when t.slug in (select slug from bespoke)
              and t.slug not in (select slug from fl_determinable)
              and td.vercel_project is not null
           then 'INFO: unknown-bespoke has a non-NULL value (was it resolved via API?)'
         else 'OK'
       end as verdict
  from tenants t
  join tenant_domains td on td.tenant_id = t.id
 order by verdict desc, t.slug, td.domain;
```
> A non-NULL on an unknown-bespoke row is **not** automatically wrong — it may mean the leader ran the live Vercel API resolution. It is flagged `INFO` so a human confirms it, not `MISMATCH`.

---

## 5. `owner_phone` — coverage for active non-flagship tenants (the release blocker)

This mirrors the shipped gate `platform/migrations/2026_07_11_owner_phone_backfill.verify.sql`. Included here so all four fields verify from one place.

```sql
\echo '== owner_phone: active non-flagship tenants STILL missing (expect 0 rows — these BLOCK the deploy) =='
select t.id, t.slug, t.name, t.owner_name, t.owner_email, t.phone as business_phone
  from tenants t
 where nullif(btrim(t.owner_phone), '') is null
   and t.status = 'active'
   and t.id <> '00000000-0000-0000-0000-000000000001'::uuid
   and t.slug not in ('nycmaid','the-nyc-maid')
 order by t.name;

\echo '== owner_phone coverage summary (active, non-flagship) =='
select count(*)                                                           as active_total,
       count(*) filter (where nullif(btrim(owner_phone),'') is not null)  as with_phone,
       count(*) filter (where nullif(btrim(owner_phone),'') is null)      as missing_phone
  from tenants
 where status = 'active'
   and id <> '00000000-0000-0000-0000-000000000001'::uuid
   and slug not in ('nycmaid','the-nyc-maid');
```

---

## 6. Optional combined GATE (RAISE-only; writes nothing)

Fails loud if any field is out of contract, so this audit can gate a deploy. Read-only — the `DO` block only RAISEs.

```sql
\echo '== GATE: FAIL LOUD on any field-contract violation =='
do $$
declare
  v_route_null   bigint;
  v_status_null  bigint;
  v_owner_block  bigint;
begin
  -- routing_mode / status must be non-null after 056
  select count(*) into v_route_null  from tenant_domains where routing_mode is null;
  select count(*) into v_status_null from tenant_domains where status is null;

  -- active non-flagship tenants must have owner_phone
  select count(*) into v_owner_block
    from tenants
   where nullif(btrim(owner_phone),'') is null
     and status = 'active'
     and id <> '00000000-0000-0000-0000-000000000001'::uuid
     and slug not in ('nycmaid','the-nyc-maid');

  raise notice 'field audit: routing_mode NULLs=%, status NULLs=%, owner_phone blockers=%',
    v_route_null, v_status_null, v_owner_block;

  if v_route_null > 0 or v_status_null > 0 or v_owner_block > 0 then
    raise exception
      'per-tenant field verification FAILED: routing_mode NULLs=%, status NULLs=%, owner_phone blockers=%. See sections 2 and 5 above.',
      v_route_null, v_status_null, v_owner_block;
  end if;

  raise notice 'per-tenant field verification PASSED: routing_mode/status non-null everywhere, and every active non-flagship tenant has owner_phone.';
end $$;
```
> **Deliberately NOT in the gate:** `vercel_project` NULLs (expected for unknown-bespoke) and `routing_mode` value mismatches for the flagship (061 legitimately overrides the slug-derived value). Those are eyeball checks (sections 4 and 2), not hard failures — gating on them would produce false blocks.

---

## Pass criteria (summary)

- **§2** routing_mode mismatches = 0 (flagship-`061` exception aside), and **§2** NULL check = 0 rows.
- **§3** status only `active`/`archived` (or `pending` from a later write), no disagreement with `active`.
- **§4** every determinable row = FL id; unknown-bespoke NULLs are expected (non-NULLs are INFO to confirm).
- **§5** zero active non-flagship tenants missing `owner_phone`.
- **§6** gate raises nothing.
