# Fortress Tenant Health Monitor — Coverage & Freshness Audit

**Author:** W1 (schema + backfill lane)
**Date:** 2026-07-12
**Scope:** `src/app/api/cron/tenant-health/route.ts` (writer), `src/app/admin/tenant-health/page.tsx`
(reader), `src/lib/tenant-health.ts` (check logic). Read-only audit — no code changed.

**Question asked:** does `/admin/tenant-health` cover every live tenant, and does it reflect
real (not cached) state?

**Short answer:** Freshness is solid (no HTTP/data caching layer in the way). Coverage has
one confirmed gap (dual-domain tenants) and one likely gap (a `pending` tenant status used
elsewhere in the codebase but not in the cron's allowlist) — both silent, i.e. a missed
tenant shows up as *absent from the page*, not as a flagged failure. The dashboard also has
no self-check: it cannot tell you it's missing anyone.

---

## 1. Freshness — VERIFIED, no caching gap

- Both the cron route and the admin page set `export const dynamic = 'force-dynamic'` —
  no Next.js Data Cache or Full Route Cache involvement. Every page load re-queries
  `tenant_health` directly via `supabaseAdmin`.
- `checkTenant()` (`tenant-health.ts`) appends a cache-busting query string
  (`?cb=${Date.now()}${performance.now()}`) and passes `cache: 'no-store'` to `fetch`, so the
  cron's own probe of each tenant site isn't served a stale CDN/edge-cached response either.
- **The only staleness is the natural kind**: the page shows whatever the last cron run wrote,
  and the cron runs every 15 min (per the page's own copy) via Vercel Cron. That's the
  intended freshness bound, not a bug.

**Gap (freshness, not caching):** the page's "last run Xm ago" banner is computed from
`max(checked_at)` **across all rows**, not per-row:

```ts
const lastRun = rows.reduce<string | null>((acc, r) => (r.checked_at && (!acc || r.checked_at > acc) ? r.checked_at : acc), null)
```

If one tenant's row has stopped being updated (see §2 below — orphaned rows never get
deleted) while every other tenant's row keeps refreshing normally, the banner still reports
"last run 2m ago" using the fresh rows' timestamp. A viewer has no way to tell that one
specific row on the list is actually a week stale and its green/red status is meaningless.
**Fix sketch:** show `timeAgo(r.checked_at)` per row (data already selected), and/or flag any
row whose `checked_at` is more than ~2 cron intervals (30 min) behind the newest row as
`STALE` regardless of its last known `status`.

---

## 2. Coverage — confirmed and likely gaps

### 2a. CONFIRMED: only the primary domain per tenant is checked

The cron builds `byTenant: Map<tenant_id, {slug, domain, primary}>` — **one entry per
tenant**, picking `tenants.domain` first, else the `tenant_domains` row with
`is_primary = true` (or the first active one). Any **secondary** domain
(`tenant_domains` rows that aren't primary) is never probed.

Concretely: nycmaid seeded two live domains in migration `043_tenant_domains.sql`
(`thenewyorkcitymaid.com` primary, `thenycmaid.com` secondary) — today nycmaid is also in
`EXCLUDED_TENANTS` so neither is checked, but the pattern generalizes to any future tenant
with >1 live domain (redirect aliases, a legacy domain kept live during a rebrand, etc.):
**if the secondary domain breaks (wrong DNS, expired cert, misconfigured redirect) while the
primary is fine, Fortress reports 100% healthy.** This is exactly the class of failure the
system exists to catch, just on the domain that isn't "the one" the cron picked.

**Fix sketch:** flatten to one health-check target per **domain**, not per **tenant** — check
every `active` row in `tenant_domains` plus `tenants.domain`, keyed by domain in
`tenant_health` (already the upsert conflict target — `onConflict: 'domain'` — so the storage
side needs no change, only the target-building loop in the cron).

### 2b. LIKELY: `tenants.status = 'pending'` is excluded from the cron's allowlist

The cron only checks tenants where:
```ts
.in('status', ['active', 'live', 'setup'])
```
Grepping the app for other **reads** of `tenants.status` turns up a 4th (and a 5th) value in
active use: `src/app/api/admin/sales/route.ts` buckets tenants into `pending / active /
suspended / cancelled` — i.e. `'pending'` is a real, currently-used status distinct from
`'setup'`. `suspended`/`cancelled` being excluded from health checks is almost certainly
correct (a suspended/cancelled account isn't expected to be up). `pending` is the
questionable one — this codebase's `status` column is not a DB-level enum
(`admin/businesses/[id]/route.ts` accepts `status` as a free-text field in its admin-editable
allowlist, no CHECK constraint found in migrations), so there's no schema-level guarantee
this list stays exhaustive.

**I could not confirm from static reading alone whether a `pending`-status tenant can carry
a live `domain`** (i.e., whether this is a real gap or a correctly-excluded pre-launch state
— `pending` may mean "sales stage, no domain yet" same as most `sales_applications`/
`management_applications` rows that also use `'pending'` in unrelated tables). **Flagging for
verification, not claiming as a bug:** `select count(*) from tenants where status = 'pending'
and domain is not null` would settle it in one query. If any come back, add `'pending'` to
the cron's allowlist (or better — see §2d).

### 2c. CONFIRMED: no reconciliation check — the dashboard cannot detect its own blind spots

Both the cron and the admin page only ever look at rows that exist. Neither compares "how
many live tenants should be monitored" against "how many rows are actually in
`tenant_health`." Concretely:
- A tenant hard-coded into `EXCLUDED_TENANTS` (currently `nycmaid`, `fla-dumpster-rentals`)
  or missing from `TEMPLATE_TENANTS`/`ROUTE_GROUP_TENANTS` when it should be listed is
  **invisible on the dashboard**, not shown as failing — same failure mode as a real outage
  (nothing changes on the board) but for a config-drift reason instead of a site-down reason.
  The `nycmaid` entry is explicitly commented `// REMOVE after cutover` in the cron source —
  i.e. a known, dated TODO that depends on someone remembering to edit code.
- A brand-new tenant that goes live between cron ticks doesn't appear on the dashboard at all
  until the next run (up to 15 min) — expected, but also not surfaced as "N tenants pending
  first check," so a launch-day operator watching the board sees nothing wrong rather than
  "not yet checked."
- If the Vercel Cron trigger itself stops firing (plan limit, misconfigured schedule,
  `CRON_SECRET` rotated without updating the Vercel Cron config) **every** row goes stale at
  once, but per §1 the page's global "last run" banner would still report the most recent
  successful row's timestamp — if even one tenant somehow still got updated (e.g. a manual
  curl with the correct secret), the banner would look fresh while the rest of the board is
  frozen.

**Fix sketch:** the cron already has the full `tenants` list in hand (`tenantRows`) before it
builds `byTenant` — cheap to also compute `expectedCount = tenantRows.filter(t => !SKIP/EXCLUDED && t.domain)` and persist/return `{checked, expectedFromTenantsTable}` so a mismatch is
visible in the cron's own JSON response (already returns `{checked, passing, failing,
failures}` — one more field). Surfacing it on the page is a further step (would need a
platform_settings-style summary row or a second small query); the cron-side count is the
cheap first move and the doc's `not fixed` recommendation for a follow-up session.

### 2d. NOTED (schema-owner context, not a gap by itself): `active` boolean vs `status` text

`tenant_domains` has carried a boolean `active` column since its original migration
(`043_tenant_domains.sql`). This lane's own earlier work (`055_tenant_domains_routing.sql`,
per `P1-SCHEMA-SPEC.md`) added a **separate** 3-state `status` text column
(`active | pending | archived`) to the same table, explicitly documented as "distinct from
the existing `active` boolean, which stays for back-compat." The Fortress cron's fallback
source-2 query still reads only the boolean:
```ts
.from('tenant_domains').select('tenant_id, domain, is_primary').eq('active', true)
```
Today that's correct (the new `status` column is the more recent addition and the boolean is
still the authoritative back-compat flag per the migration's own comment). Flagging only so a
future session doesn't have two lifecycle signals drift apart unnoticed on this table: if
`status` ever becomes the driver of domain activation flow (e.g. a domain sits at
`status='pending'` mid-provisioning while `active` is prematurely flipped true, or vice
versa), the cron would need to consult both. Not fixing — no evidence today the two columns
disagree on any row, and this is a `tenant_domains` schema question inside this lane's own
mandate, not a Fortress bug.

---

## 3. What's solid (verified, not just assumed)

- **Real routing detection, not a shallow ping.** `checkTenant()` follows redirects manually
  (own loop-detection, `MAX_HOPS = 8`) and reads `x-matched-path` to confirm a tenant serves
  its own `/site/<slug>` and not the generic `/site/template` — this is the actual
  2026-07-08 outage class, and the check is structural (compares the matched path), not a
  string-match on page content that could pass accidentally.
- **Dual-source domain resolution matches the resolver's precedence.** The cron unions
  `tenants.domain` (primary) with `tenant_domains` (fallback, `active = true` only) — this
  was already fixed this lane-cycle (per `LEADER-CHANNEL.md`, commit `e2cbce20`, "cron/
  tenant-health precedence backwards" bug) to match `tenant-lookup.ts`'s real resolution
  order. Verified current: source-1 `tenants.domain` wins, source-2 `tenant_domains` only
  fills tenants source-1 didn't cover — read directly in the file, matches the resolver.
- **SSRF-guarded.** Every fetch (including redirect hops) goes through `assertPublicUrl()`
  before touching the network — the health checker can't be turned into an internal-network
  probe via a malicious tenant domain/DNS rebind.
- **No accidental side effects.** The lead-endpoint check is `GET` only specifically so it
  never creates a row or fires a notification — documented and true by inspection (no POST
  anywhere in `checkTenant`).
- **Auth is real, not presence-only.** The cron requires an exact `Bearer $CRON_SECRET`
  match (plain `!==` today — same class of timing side-channel as this lane's queue-c fix;
  out of this doc's scope, flagging only: `cron/tenant-health/route.ts:54` uses
  `authHeader !== \`Bearer ${process.env.CRON_SECRET}\`` and would benefit from the same
  `safeEqual()` helper landed this session in `lib/secret-compare.ts`).

---

## 4. Summary table

| Area | Verdict | Detail |
|---|---|---|
| HTTP/data caching | ✅ clean | `force-dynamic` both sides, `no-store` fetches, cache-busting query |
| Per-row staleness surfaced | ❌ gap | only a global "last run" banner; a frozen row hides among fresh ones (§1) |
| Multi-domain tenants | ❌ gap (confirmed) | only the primary domain per tenant is probed (§2a) |
| `status='pending'` tenants | ⚠️ unverified | excluded from the cron; unclear if any carry a live domain (§2b) |
| Self-check / reconciliation | ❌ gap (confirmed) | no comparison of tenants-that-should-be-checked vs rows-that-exist (§2c) |
| Hardcoded tenant lists drift | ❌ gap (confirmed) | `EXCLUDED_TENANTS`/`TEMPLATE_TENANTS`/`ROUTE_GROUP_TENANTS` require a manual code edit to stay correct; `nycmaid` entry has a dated "REMOVE after cutover" TODO | 
| Routing-outage detection itself | ✅ solid | structural `x-matched-path` check, not string-matching |
| Domain source precedence | ✅ solid (recently fixed) | matches resolver order, verified by reading both files |
| SSRF safety | ✅ solid | every fetch guarded |
| Cron auth | ⚠️ minor | plain `!==` secret compare — same class as queue-c, not fixed here (out of scope) |

**Nothing in this audit was fixed** — file-only, non-gated per standing orders, and every
item above is either a design tradeoff worth a decision (multi-domain, reconciliation) or
needs one live-DB query to confirm before it's worth a code change (`pending` status). Not
done: no code touched in `cron/tenant-health` or `admin/tenant-health`.
