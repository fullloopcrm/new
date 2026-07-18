# tenant_domains: seomgr fleet health had no is_primary preference at all (2026-07-18 08:21)

## Bug
`checkFleetHealth()` (`src/lib/seo/health.ts`, wired to the live
`GET /api/cron/seo-health` cron route) unions two sources to build the list of
domains to HTTP-check: `tenants.domain` (Source 1, authoritative) and, for
tenants with no `tenants.domain`, active `tenant_domains` rows (Source 2,
fallback) — the exact same shape `tenant-health/route.ts`'s Fortress cron uses
(dead-code primary-preference bug fixed there earlier today, 08:13).

This file's copy of the pattern was worse: it never had an `is_primary`
preference check at all, not even a broken one.

```ts
const { data, error } = await supabaseAdmin.from('tenant_domains').select('domain,tenant_id').eq('active', true)
let unlinkedIdx = 0
for (const r of data ?? []) {
  const tenantId = (r.tenant_id as string | null) ?? null
  if (tenantId && byTenant.has(tenantId)) continue // tenants.domain already won
  byTenant.set(tenantId ?? `unlinked:${unlinkedIdx++}`, { domain: String(r.domain), tenant_id: tenantId })
}
```

For a Source-2-only tenant with more than one active `tenant_domains` row (a
multi-neighborhood tenant), the first row processed wins outright and every
subsequent row for that tenant hits the `continue` — there is no branch that
ever looks at `is_primary`. The query has no `.order()`, so which row wins is
Postgres's unspecified return order, not a deliberate choice. If that row is a
secondary/neighborhood domain, `runFleetHealth()` HTTP-checks the wrong host:
a `site_down` `seo_issues` row gets filed against (or fails to get filed
against) the wrong domain for that tenant, silently.

## Fix (file-only, no push/deploy/DB)
`src/lib/seo/health.ts` — ported the exact discipline from the tenant-health
fix: snapshot Source-1 winners into their own `source1Ids` Set before the
Source-2 loop, select `is_primary` alongside `domain`/`tenant_id`, and prefer
it when a tenant already has a Source-2 candidate:

```ts
const source1Ids = new Set(byTenant.keys())
const { data, error } = await supabaseAdmin.from('tenant_domains').select('domain,tenant_id,is_primary').eq('active', true)
...
for (const r of data ?? []) {
  const tenantId = (r.tenant_id as string | null) ?? null
  if (tenantId && source1Ids.has(tenantId)) continue // tenants.domain already won
  const key = tenantId ?? `unlinked:${unlinkedIdx++}`
  const cur = tenantId ? byTenant.get(key) : undefined
  if (!cur || (r.is_primary && !cur.primary)) {
    byTenant.set(key, { domain: String(r.domain), tenant_id: tenantId, primary: !!r.is_primary })
  }
}
```

Unlinked (`tenant_id: null`) rows are unaffected — each still gets its own
unique key, so there is no tenant to prefer a primary within.

## Tests
Added `health.multi-domain-primary-preference.test.ts`: seeds one tenant with
`tenants.domain = null` (forcing Source 2) and two active `tenant_domains`
rows, non-primary inserted (and thus returned) first, primary second —
mirrors the tenant-health test's exact ordering. Mocks `safeFetch` to record
the URL(s) actually checked. RED-confirmed against the pre-fix code (checked
`neighborhood.example.com` instead of `primary.example.com`; verified via
`git apply -R` on the diff, not a stash), GREEN after. `seo` + `seo-health` +
`tenant-health` suites: 3 files, 5 tests, all passing.

## Swept for siblings
Checked every other `tenant_domains` consumer under `src/lib/seo/` and
`domains.ts` for the same "silently pick one domain per tenant" shape:
- `seo/onboarding.ts`'s `backfillUntrackedDomains` and `seo/auto-verify.ts`'s
  eligibility query both key by **domain**, registering/verifying every
  active domain as its own `seo_properties` row — no per-tenant picking, no
  ambiguity possible.
- `seo/ingest.ts`'s `linkTenant()` does an exact `.eq('domain', domain)`
  lookup for one specific domain — not a multi-row-per-tenant accumulator.
- `domains.ts`'s `getTenantDomains()` returns **all** active domains for a
  tenant (by design, for neighborhood/zip routing) rather than collapsing to
  one — not the same bug shape.
- `seo/competitors.ts`'s `byDomain` map is keyed by literal domain string, not
  tenant — no primary-preference concern.

`seo/health.ts` was the only sibling instance of this specific bug shape.

## Verification
- `tsc --noEmit`: clean on both touched files. Pre-existing baseline noise
  only (`.next` admin-auth route-typing quirk, 2 unrelated test-file
  arg-count errors, 2 from the untracked `sunnyside-clean-nyc/site-nav.ts`
  outside this lane) — none newly introduced, none reference `seo/health.ts`.
- `eslint`: 0 warnings on both touched files.
- Full suite: 672/672 files, 3478 passed + 1 pre-existing expected-fail
  (3479 total), 0 regressions.

## Not touched
- `runFleetHealth()`'s `seo_issues` persistence logic — unaffected by which
  domain wins upstream, no change needed.
- No schema/migration change — pure application-layer read-path bug, same
  disposition as the tenant-health fix (the DB-level
  `tenant_domains_one_primary_per_tenant` backstop already guarantees at most
  one `is_primary=true` row per tenant; this makes seomgr's fleet check
  actually use that guarantee).

File-only. No push/deploy/DB.
