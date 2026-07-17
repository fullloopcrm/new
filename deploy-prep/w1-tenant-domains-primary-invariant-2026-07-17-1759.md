# tenant_domains: at-most-one-is_primary-per-tenant invariant (2026-07-17 17:59)

## Bug
`tenant_domains.is_primary` has always been treated as a 1:1-per-tenant flag
by every reader — `src/app/api/admin/businesses/[id]/site-export/route.ts`
resolves "the tenant's primary public domain" via
`.find(d => d.is_primary) || domains[0]`, and 068's own backfill mapped
`is_primary:true -> type:'primary'` on that same assumption — but nothing in
the schema or either write path enforced it.

Two write paths could produce 2+ `is_primary:true` rows for one tenant:

1. **POST /api/admin/websites** — inserted a caller-supplied `is_primary`
   with zero check for an existing primary on that tenant. Two admin "Add
   domain" submissions (or one resubmitted request) with the checkbox on
   left a tenant with 2+ primary domains.
2. **activate-tenant.ts's `domain_routing` step** (every activation runs
   this — highest-volume write path to this table) — the upsert uses
   `ignoreDuplicates: true` (ON CONFLICT DO NOTHING on `domain`), which only
   ever WRITES `is_primary` on a brand-new row; it never demotes an existing
   one. A tenant re-activated after its custom domain changed (a rebrand)
   kept the OLD domain row's `is_primary:true` while the NEW domain row also
   got `is_primary:true` — same violation, reached without touching the
   admin UI at all.

Impact: silent, nondeterministic data corruption, not a crash — every
consumer picks an arbitrary match instead of erroring, so which domain
counts as "the" tenant website flips depending on row insertion order.

## Fix (file-only, no push/deploy/DB)
- `src/app/api/admin/websites/route.ts` — POST now clears any existing
  `is_primary:true` row for the tenant before inserting a new one.
- `src/lib/activate-tenant.ts` — `domain_routing` step gained a
  `primaryFixed` resync (same shape as the existing `driftFixed` /
  `vercelProjectFixed` / `typeFixed` steps): fetch the tenant's current
  primaries, demote any not in this run's `rows`, fetch-then-filter in JS
  rather than a `.not(col,'in',…)` PostgREST filter so it stays compatible
  with both the real client and the in-memory test fake (same reasoning as
  the existing `AUTO_VERCEL_PROJECT_VALUES` comment in that file).
- `src/lib/migrations/2026_07_17_tenant_domains_one_primary_per_tenant.sql`
  — DB-level backstop: a deterministic dedupe UPDATE (prefer `type='primary'`,
  then oldest `created_at`, then lowest `id`) followed by a partial unique
  index `(tenant_id) WHERE is_primary`. File-only, **not applied** — this is
  DDL, gated on Jeff's prod DB go-ahead per standing instructions.

## Tests
- `src/app/api/admin/websites/route.test.ts` — 3 new cases: clears an
  existing primary when a second `is_primary` domain is added; leaves it
  alone when the new domain isn't primary; never touches a *different*
  tenant's primary.
- `src/lib/activate-tenant-primary-domain-sync.test.ts` (new file) —
  full-integration rebrand scenario via `fake-supabase`: seeds a stale
  old-custom-domain primary row + a tenant whose `domain` now points at a
  new custom domain, asserts the old row gets demoted and exactly one
  primary remains after `activateTenant()`.
- Mutation-verified both: stashed each fix independently, confirmed the new
  tests fail RED against pre-fix code (exact assertion failures, not just
  "some test failed"), restored, confirmed GREEN.

## Verification
- `tsc --noEmit`: clean on all touched files (2 pre-existing unrelated
  baseline errors elsewhere, untouched).
- `eslint`: 0 warnings on touched files.
- Full suite: 587/587 files, 3168 passed + 1 pre-existing expected-fail, 0
  regressions.

## Not touched
- `scripts/onboard-tenant-site.ts` also writes `is_primary:true` on tenant
  onboarding, but it's a manual CLI script for brand-new tenants (upsert
  keyed on `domain`, no prior row exists for a fresh onboard) — much lower
  reach than the two live write paths above. Flagging, not fixing this pass;
  same duplicate-primary risk exists in principle if the script is re-run
  against an already-onboarded tenant with a different domain arg.
- tenant_domains schema lane otherwise reconfirmed intact
  (043/055/056/068/069 + this file).

File-only. No push/deploy/DB. Migration DDL not applied — prod write gated
on Jeff's approval per standing rules.
