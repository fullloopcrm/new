# Retiring `BESPOKE_SITE_TENANTS` — DB-Driven Routing Plan

_Status: **PLAN ONLY**. No code change, no migration, no push. All "current state"
facts below were verified against prod (Supabase project `cetnrttgtoajzjacfbhe`)
read-only on 2026-07-11 by worker W3._

## Problem

Which tenants serve their own bespoke `/site/<slug>` site (vs. the shared
`/site/template`) is decided by a **hardcoded `Set` literal**,
`BESPOKE_SITE_TENANTS`, in `src/middleware.ts:401`. A dropped line in a merge or
a deleted folder silently replaces a live business's website with the generic
template — exactly the 2026-07-08 / 2026-07-10 mis-route outages.

The DB already carries the authoritative intent per domain:
`tenant_domains.routing_mode`. Two sources of truth drift. This plan moves the
routing decision onto the DB column and retires the hardcoded set.

## Current state (verified, not assumed)

- **`tenant_domains.routing_mode`**: `text NOT NULL DEFAULT 'template'`. Values in
  prod: `'bespoke'` (21 active rows) and `'template'` (16 active rows). Fully
  populated — no NULLs on active rows.
- **Parity is currently exact.** Every one of the 20 in-set **active** tenants has
  `routing_mode = 'bespoke'` on its active domain(s); the 2 active tenants **not**
  in the set (`full-loop-crm`, `the-va-virtual-assistant`) are `'template'`. **No
  tenant has mixed routing modes.** The hardcoded set and the DB column agree 1:1
  today.
- **The resolver does not read `routing_mode`.** `getTenantBySlug` /
  `getTenantByDomain` (`src/lib/tenant-lookup.ts`) select only
  `id, slug, name, domain, status`. The column is invisible to middleware right now.
- **`routing_mode` (and `status`, `vercel_project`, `updated_at`) exist in prod but
  have NO migration file.** Migration `043_tenant_domains.sql` creates the table
  *without* these columns; they were added out-of-band. `grep -rn routing_mode
  src/lib/migrations` → nothing. This is a **prerequisite blocker** (see Safety
  step 0).
- **The routing decision is per-SLUG; `routing_mode` is per-DOMAIN.** The bespoke
  folder is `/site/<slug>`; a tenant could in principle set different modes on two
  domains (reconcile Drift I). None do today, but the plan must pick a
  domain→slug collapse rule.
- **Two orphan entries** (`toll-trucks-near-me`, `wash-and-fold-hoboken`) are in the
  set + in `verify-protected-tenants.mjs` PROTECTED + have `/site/<slug>` folders,
  but have **zero** `tenants` rows and **zero** `tenant_domains` rows. See
  [Orphan triage](#orphan-triage).

## Target

Middleware decides `bespoke` vs `template` from the resolved tenant's
`routing_mode`, not from a source-code `Set`. `BESPOKE_SITE_TENANTS` is deleted.
The build-time guard is repointed at the DB column.

Fail-safe default stays `'template'`: if the routing_mode lookup is missing or the
edge DB read fails, the tenant gets the shared template — never a broken bespoke
route. This matches today's fail-open-to-main-site behavior.

## How middleware would read `routing_mode`

Routing happens in two resolution paths, both of which already hit the DB, so
reading `routing_mode` adds **no new round trip** if folded into the existing query:

1. **Custom domain** (`getTenantByDomain(host)`): the mode comes from the matched
   `tenant_domains` row for that exact domain. The first branch (which matches
   `tenants.domain` directly and never touches `tenant_domains`) must also fetch
   the domain's routing_mode, defaulting to `'template'` when there's no row.
2. **Subdomain slug** (`getTenantBySlug(slug)`): no domain in hand → use the
   tenant's **primary active** `tenant_domains` row (`is_primary = true AND active`),
   falling back to any active row, then to `'template'`.

`routingMode` is threaded from the resolver through `rewriteToSite`, replacing the
`BESPOKE_SITE_TENANTS.has(tenantSlug)` test. `ROOT_SITE_TENANTS` (empty today) is
untouched.

## Exact code diff (illustrative — verify before applying)

### 1. `src/lib/tenant-lookup.ts` — return `routingMode`

```diff
 type TenantInfo = {
   id: string
   slug: string
   name: string
   domain: string | null
   status: string
+  routingMode: 'bespoke' | 'template'
 }
```

`getTenantBySlug` — resolve the primary active domain's mode:

```diff
   const sb = getSupabase()
   const { data, error } = await sb
     .from('tenants')
     .select('id, slug, name, domain, status')
     .eq('slug', slug)
     .single()

   if (error || !data) {
     setCache(slugCache, slug, null)
     return null
   }

+  // routing_mode lives per-domain; for the slug path use the primary active
+  // domain, then any active domain, else the safe default 'template'.
+  const { data: domRows } = await sb
+    .from('tenant_domains')
+    .select('routing_mode, is_primary')
+    .eq('tenant_id', data.id)
+    .eq('active', true)
+    .order('is_primary', { ascending: false })
+  const routingMode = (domRows?.[0]?.routing_mode === 'bespoke') ? 'bespoke' : 'template'
+
   const tenant: TenantInfo = {
     id: data.id,
     slug: data.slug,
     name: data.name,
     domain: data.domain,
     status: data.status,
+    routingMode,
   }
```

`getTenantByDomain` — branch 1 (tenants.domain match) needs a mode lookup; branch 2
(tenant_domains fallback) already reads the row, so add the column:

```diff
   if (tenantData) {
+    // tenants.domain match doesn't touch tenant_domains — fetch this domain's
+    // routing_mode explicitly; default 'template' if there's no row for it.
+    const { data: dom } = await sb
+      .from('tenant_domains')
+      .select('routing_mode')
+      .eq('domain', cleanDomain)
+      .eq('active', true)
+      .maybeSingle()
     const tenant: TenantInfo = {
       id: tenantData.id,
       slug: tenantData.slug,
       name: tenantData.name,
       domain: tenantData.domain,
       status: tenantData.status,
+      routingMode: dom?.routing_mode === 'bespoke' ? 'bespoke' : 'template',
     }
     setCache(domainCache, cleanDomain, tenant)
     return tenant
   }

-  // Fall back to tenant_domains table
   const { data: domainRow } = await sb
     .from('tenant_domains')
-    .select('tenant_id')
+    .select('tenant_id, routing_mode')
     .eq('domain', cleanDomain)
     .eq('active', true)
     .single()
```

…and carry `domainRow.routing_mode` into that branch's returned `TenantInfo`
(same `=== 'bespoke' ? 'bespoke' : 'template'` guard).

### 2. `src/middleware.ts` — decide from the mode, thread it through

`rewriteToSite` gains a `routingMode` param; the three call sites pass it:

```diff
-function rewriteToSite(req: NextRequest, tenantId: string, tenantSlug: string): NextResponse {
+function rewriteToSite(
+  req: NextRequest,
+  tenantId: string,
+  tenantSlug: string,
+  routingMode: 'bespoke' | 'template',
+): NextResponse {
```

```diff
-  const tenant = await getTenantBySlug(subdomain)
-  if (tenant && tenantServesSite(tenant.status)) {
-    return rewriteToSite(req, tenant.id, tenant.slug)
-  }
+  const tenant = await getTenantBySlug(subdomain)
+  if (tenant && tenantServesSite(tenant.status)) {
+    return rewriteToSite(req, tenant.id, tenant.slug, tenant.routingMode)
+  }
```

```diff
-  const tenant = await getTenantByDomain(hostname)
-  if (tenant && tenantServesSite(tenant.status)) {
-    return rewriteToSite(req, tenant.id, tenant.slug)
-  }
+  const tenant = await getTenantByDomain(hostname)
+  if (tenant && tenantServesSite(tenant.status)) {
+    return rewriteToSite(req, tenant.id, tenant.slug, tenant.routingMode)
+  }
```

The `STATIC_TENANT_MAP` fallback (florida-maid) has no DB row in hand — hardcode its
known mode:

```diff
-    if (staticTenant) {
-      return rewriteToSite(req, staticTenant.id, staticTenant.slug)
-    }
+    if (staticTenant) {
+      // Static map is the edge-DB-unreliable fallback; florida-maid is bespoke.
+      return rewriteToSite(req, staticTenant.id, staticTenant.slug, 'bespoke')
+    }
```

The decision itself, replacing the `Set` lookup:

```diff
-  const BESPOKE_SITE_TENANTS = new Set<string>([
-    'nycmaid',
-    // …22 entries…
-  ])
-  const siteBase = ROOT_SITE_TENANTS.has(tenantSlug)
-    ? '/site'
-    : BESPOKE_SITE_TENANTS.has(tenantSlug)
-      ? `/site/${tenantSlug}`
-      : '/site/template'
+  const siteBase = ROOT_SITE_TENANTS.has(tenantSlug)
+    ? '/site'
+    : routingMode === 'bespoke'
+      ? `/site/${tenantSlug}`
+      : '/site/template'
```

## Safety steps (staged; each reversible)

### Step 0 — Prerequisite: back-fill the migration (BLOCKER)

`routing_mode` exists in prod but not in the repo's migration history. Before any
code reads it, add an idempotent migration so a fresh/rebuilt env has the column
and default:

```sql
alter table tenant_domains
  add column if not exists routing_mode text not null default 'template',
  add column if not exists status       text not null default 'active',
  add column if not exists vercel_project text;
```

Author as a FILE only; the leader runs prod DDL after Jeff approves. (Column already
present in prod, so the ALTER is a no-op there — this exists for parity/fresh envs.)

### Step 1 — Assert parity (CI gate)

Parity is exact **today** (verified above). Lock it so it can't silently break
before cutover:

- The reconcile script (`scripts/reconcile-tenant-config.mjs`) already emits CRIT on
  the two disagreement classes: Drift G (`routing_mode=bespoke` but slug not in set)
  and Drift H (set member but `routing_mode=template`). It exits 1 on any CRIT and is
  wired into CI.
- **Gap to close first:** reconcile only iterates `tenants` rows, so it never flags
  set entries with **no tenant row** (the 2 orphans). Add a check that walks
  `BESPOKE_SITE_TENANTS` and CRITs any entry lacking a resolvable tenant. (Owned by
  W3 / PR9 — noted as follow-up, not implemented here.)
- Cutover is gated on a **green reconcile with zero CRIT** across a run that carries
  the full-access token.

### Step 2 — Dual-read shadow (observe, don't act)

Ship the resolver change (returns `routingMode`) but keep the **hardcoded set as the
live decision**. In middleware, compute both and log/annotate disagreement without
changing behavior:

```ts
const legacyBespoke = BESPOKE_SITE_TENANTS.has(tenantSlug)
const dbBespoke = routingMode === 'bespoke'
if (legacyBespoke !== dbBespoke) {
  console.warn(`[routing-shadow] ${tenantSlug}: set=${legacyBespoke} db=${dbBespoke}`)
}
// decision still uses legacyBespoke this step
```

Watch edge logs for N days (suggest ≥3 covering a deploy + a tenant onboarding).
**Zero disagreements** → the DB column is a safe replacement under real traffic,
including cache warm/cold and edge-DB-flaky paths.

### Step 3 — Cutover (flip, keep rollback)

Flip the decision to `routingMode === 'bespoke'`. **Keep `BESPOKE_SITE_TENANTS`
defined but unused for one release** as an instant, one-line rollback (revert the
ternary). Re-verify each live bespoke tenant renders its own site (spot-check the
protected domains, not just a build pass).

### Step 4 — Remove

- Delete `BESPOKE_SITE_TENANTS` and the shadow logging.
- Repoint `scripts/verify-protected-tenants.mjs`: instead of asserting each PROTECTED
  slug is in the source `Set`, assert its **active domain has `routing_mode='bespoke'`
  in the DB** (and its folder exists). This keeps the deploy-blocking backstop but
  sources truth from the DB. (Requires the token in CI; when absent, skip cleanly —
  same token-guard pattern as reconcile.)
- Resolve the 2 orphans (below) — a DB-backed guard cannot assert them (no row), so
  they must be dispositioned as part of this step or they break the new guard.

## Orphan triage

`toll-trucks-near-me` and `wash-and-fold-hoboken`:

| Signal | Value (verified 2026-07-11) |
|---|---|
| In `BESPOKE_SITE_TENANTS` | yes (`src/middleware.ts:410,413`) |
| In `verify-protected-tenants.mjs` PROTECTED | yes (lines 52, 55) |
| `/site/<slug>/` folder exists | yes (both render) |
| Row in `tenants` (any status) | **none** |
| Row in `tenant_domains` | **none** |
| In `STATIC_TENANT_MAP` | no |

**Consequence:** with no tenant row and no domain row, neither
`getTenantBySlug` nor `getTenantByDomain` can ever resolve them, and they're not in
the static map. Their domains fall through to the main site. **These entries are
unreachable through this repo's middleware** — the bespoke-set membership, the
PROTECTED entry, and the folder are all serving nothing here. The build guard is
protecting sites the platform can't actually route to (false confidence).

**Two hypotheses (cannot disambiguate from here — Vercel topology unauthed):**

- **(a) Dead:** the tenant was deleted or never created; the folder is stale code from
  the outage cleanup.
- **(b) Live standalone:** the domain is served by a **separate** Vercel deployment
  outside the multi-tenant repo (as the original nycmaid standalone was), and this
  repo's folder is a vestigial copy.

**Disposition (reversible — no deletion now):**

1. **Do not delete** the folders or drop them from PROTECTED yet. Deleting a folder
   that is the source of a live standalone would dark a real site.
2. **Ask Jeff / leader:** are `tolltrucksnearme.com` and the Hoboken laundry domain
   live, and if so which Vercel deployment serves them?
3. **If dead:** remove from `BESPOKE_SITE_TENANTS`, remove from PROTECTED, and
   `git rm -r src/app/site/<slug>` (leader runs). No DB change (no rows to clean).
4. **If live standalone:** still remove from **this repo's** `BESPOKE_SITE_TENANTS`
   and PROTECTED — multi-tenant middleware never serves them, so guarding them here
   is misleading. Leave the folder only if it's the actual source of that standalone;
   otherwise remove it too.
5. Either way they **block nothing** in the retirement (already unreachable), but they
   **must be dispositioned before Step 4**, because a DB-backed guard (Step 4) will
   fail on a PROTECTED slug that has no `routing_mode='bespoke'` row.

## Follow-ups (owned by W3 / PR9, not done here)

- Add the orphan-detection check to `reconcile-tenant-config.mjs` (walk the bespoke
  set, CRIT any entry with no resolvable tenant). Currently the script only iterates
  DB tenants, so it misses set-only orphans entirely.
- Author the Step-0 migration file for `routing_mode` / `status` / `vercel_project`.
