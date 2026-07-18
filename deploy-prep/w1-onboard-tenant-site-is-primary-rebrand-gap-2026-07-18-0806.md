# tenant_domains: onboard-tenant-site.ts rebrand left 2+ is_primary rows (2026-07-18 08:06)

## Bug
Continuation of the `is_primary`-invariant surface closed 2026-07-17
(`w1-tenant-domains-primary-invariant-2026-07-17-1759.md`), which fixed the
two live write paths (`POST /api/admin/websites`, `activate-tenant.ts`'s
`domain_routing` step) but explicitly flagged a third, lower-reach write
path as not yet fixed:

`scripts/onboard-tenant-site.ts`'s `provisionTenant()` upserts a
`tenant_domains` row with `is_primary: true` unconditionally, keyed on
`onConflict: 'domain'`. For a brand-new tenant this is harmless (no prior
row exists). But the script is designed to be re-runnable — it upserts
`tenants` on `onConflict: 'slug'`, meaning re-running it for an
already-onboarded tenant with a **different `--domain`** (a rebrand) is a
supported path, not a misuse. That re-run:
- inserts a NEW `tenant_domains` row for the new domain with
  `is_primary: true` (the `onConflict: 'domain'` upsert can't match the old
  domain, so it's a fresh INSERT, not an UPDATE)
- never touches the OLD domain row, which keeps `is_primary: true`

Same 2+-primaries silent-data-corruption class as the two paths fixed
yesterday: every reader (`site-export`'s "resolve the primary domain", the
068 backfill's `is_primary -> type:'primary'` mapping) picks an arbitrary
match once there are two, rather than erroring.

## Fix (file-only, no push/deploy/DB)
`scripts/onboard-tenant-site.ts` — before the `tenant_domains` upsert,
demote any other `is_primary: true` row for this `tenant.id` (excluding the
row for the domain being written) to `is_primary: false`. Same shape as the
`POST /api/admin/websites` fix (demote-then-write), adapted to run
unconditionally since this script's `tenant_domains` write always sets
`is_primary: true` — there's no `is_primary`-optional branch to gate on
here, unlike the admin route.

## Tests
None added. Confirmed via the previous day's fix (same file) that
`scripts/` is out of vitest's `include` glob (`src/**/*.test.{ts,tsx}`
only) — no harness reachable. Verified by reading: the new `.update(...)`
call mirrors the already-tested `POST /api/admin/websites` demote query
field-for-field (`tenant_id` + `is_primary:true` + exclude the target
domain), and the DB-level backstop below makes the invariant enforced even
if this read-verification is wrong.

## Verification
- `tsc --noEmit`: clean on the touched file. Pre-existing baseline noise
  only (2 unrelated test-file arg-count errors, 2 from the untracked
  `sunnyside-clean-nyc/site-nav.ts` that isn't part of this lane, 1
  `admin-auth` route-typing quirk) — none newly introduced, none reference
  `onboard-tenant-site.ts`.
- `eslint`: 0 new warnings (the file's pre-existing `'exists' is defined but
  never used` warning, already noted in yesterday's fix doc, is unchanged).

## Not touched
- The DB-level backstop from yesterday's fix
  (`2026_07_17_tenant_domains_one_primary_per_tenant.sql` — dedupe UPDATE +
  partial unique index `(tenant_id) WHERE is_primary`) already covers this
  script's rebrand case too once applied; this fix closes the application-
  layer gap in the meantime. Still file-only, not applied — DDL gated on
  Jeff's prod DB go-ahead per standing instructions, same file as before
  (no new migration needed for this specific fix).
- tenant_domains schema lane otherwise reconfirmed intact
  (043/055/056/068/069/2026_07_17_one_primary_per_tenant +
  unnormalized-domain fix + this file).

File-only. No push/deploy/DB.
