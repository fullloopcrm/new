# tenant_domains: tenant-health's primary-domain preference was dead code (2026-07-18 08:13)

## Bug
`GET /api/cron/tenant-health` (the "Fortress" live-darkening detector) builds
its per-tenant check target from two sources: `tenants.domain` (Source 1,
authoritative) and, for tenants with no `tenants.domain`, active
`tenant_domains` rows (Source 2, fallback). For a Source-2-only tenant with
**more than one** active `tenant_domains` row (a multi-domain/multi-neighborhood
tenant — the same shape `attribution.ts` and `getDomainsForNeighborhood()`
already handle elsewhere in this lane), the loop was supposed to prefer the
`is_primary` row over a non-primary one:

```ts
for (const r of tdRows ?? []) {
  if (byTenant.has(r.tenant_id)) continue // tenants.domain already won
  ...
  const cur = byTenant.get(r.tenant_id)
  if (!cur || (r.is_primary && !cur.primary)) {
    byTenant.set(r.tenant_id, { slug, domain: r.domain, primary: !!r.is_primary })
  }
}
```

That preference check never ran. The guard on the first line reads
`byTenant.has(r.tenant_id)`, not "has via Source 1" — so once the tenant's
*first* `tenant_domains` row was processed and written into `byTenant`, every
subsequent row for that same tenant hit the `continue` and never reached the
`cur`/`is_primary` check below it. `cur` was therefore always `undefined` at
the point it's read — the comment "tenants.domain already won" was only true
for genuine Source-1 tenants; for Source-2-only tenants it silently meant
"a `tenant_domains` row already won," any row, primary or not.

Net effect: for a Source-2-only multi-domain tenant, whichever
`tenant_domains` row Postgres happened to return first won — the query has
no `.order()`, so this is unspecified/insertion-order-dependent, not a
deliberate choice. If that row was a secondary/neighborhood domain, Fortress
checked and persisted `tenant_health` for the wrong domain, silently: it
could report "healthy" while the tenant's real primary/customer-facing
domain was down (never checked), or alert on a secondary domain's transient
issue while masking as the tenant's overall status. `tenant_health` is read
by the dashboard and drives the Telegram alert `alertOwner()` call, so this
was a live monitoring-accuracy gap, not just a display one.

## Fix (file-only, no push/deploy/DB)
`src/app/api/cron/tenant-health/route.ts` — snapshot the Source-1 winners
into their own `source1Ids` set *before* the Source-2 loop, and gate the
`continue` on that set instead of the live, mutating `byTenant` map:

```ts
const source1Ids = new Set(byTenant.keys())
...
for (const r of tdRows ?? []) {
  if (source1Ids.has(r.tenant_id)) continue // tenants.domain already won
  ...
```

Now `byTenant.get(r.tenant_id)` correctly reflects a *previous Source-2 row*
for the same tenant (or `undefined` on the first), so the
`r.is_primary && !cur.primary` preference actually executes across a
multi-row Source-2 tenant, regardless of query return order.

## Tests
Added `route.multi-domain-primary-preference.test.ts`: seeds one tenant with
`tenants.domain = null` (forcing Source 2) and two active `tenant_domains`
rows, non-primary inserted (and thus returned) first, primary second —
exactly the ordering that exposed the dead code. Asserts `checkTenant` is
called with the primary domain only, and the persisted `tenant_health` row's
`domain` is the primary one. RED-confirmed against the pre-fix code (fails:
checks `neighborhood.example.com` instead of `primary.example.com`), GREEN
after the fix. Full `tenant-health` suite: 2 files, 4 tests, all passing.

## Verification
- `tsc --noEmit`: clean on both touched files. Pre-existing baseline noise
  only (`admin-auth` route-typing quirk, 2 unrelated test-file arg-count
  errors, 2 from the untracked `sunnyside-clean-nyc/site-nav.ts` outside this
  lane) — none newly introduced, none reference `tenant-health/route.ts`.
- `eslint`: 0 warnings on both touched files.

## Not touched
- The Source-1 (`tenants.domain`) path was already correct — one row per
  tenant, no multi-row ambiguity possible there.
- No schema/migration change — this is a pure application-layer read-path
  bug, not a data invariant gap (the existing one-primary-per-tenant DB
  backstop from 2026-07-17 already guarantees at most one `is_primary=true`
  row per tenant; this fix makes the app actually *use* that guarantee when
  choosing which domain to health-check).

File-only. No push/deploy/DB.
