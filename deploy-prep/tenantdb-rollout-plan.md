# tenantDb Rollout Plan — converting the API surface to tenant-scoped DB access

**Status:** planning / file-only (no code converted by this doc)
**Author:** W2 (resolver + tenant-isolation lane)
**Date:** 2026-07-12
**Scope:** `platform/src/app/api/**/route.ts`

---

## 1. Why this exists

Every query in the platform runs through the **service_role** Supabase key, which
**bypasses Row-Level Security**. Cross-tenant isolation therefore depends entirely
on each route remembering to add `.eq('tenant_id', …)` to every read and stamp
`tenant_id` on every write. **One forgotten filter is a cross-tenant data leak.**

`src/lib/tenant-db.ts` (`tenantDb(tenantId)`) makes the safe path the default:

```ts
const db = tenantDb(ctx.tenantId)
await db.from('bookings').select('*').eq('status', 'completed')  // auto .eq('tenant_id', ctx)
await db.from('bookings').insert({ … })                          // auto-stamps tenant_id
```

- `select` / `update` / `delete` are auto-filtered by `tenant_id`.
- `insert` / `upsert` auto-stamp `tenant_id` **last**, overriding any caller value
  (so a forged `tenant_id` in a request body cannot win).

This is the **app-layer half** of defense-in-depth. The DB-layer half (positive RLS
policies + a non-superuser role) lands separately; **until then this wrapper is the
primary guard.** Rolling it across the whole API surface is the objective.

> **This wrapper is for TENANT-SCOPED tables only.** Tables with no `tenant_id`
> (`tenants`, `inquiries`, `leads`, `platform_settings`, and join tables like
> `crew_members`) are cross-tenant by design and must keep using `supabaseAdmin`
> directly — see §5 (NONE-write exceptions).

---

## 2. What "converted" means

A route is **converted** when every tenant-scoped table access goes through
`tenantDb(tenantId)` instead of raw `supabaseAdmin.from(...)`. A route may be
**partially** converted (uses both) when it legitimately touches a mix of
tenant-scoped and cross-tenant tables.

---

## 3. Inventory (authoritative counts)

Regenerate at any time (these numbers are from 2026-07-12, git tip `7fd21a1b`):

```bash
cd platform
CONV=$(grep -rl "tenantDb(" src/app/api --include=route.ts | sort)
ALL=$(find src/app/api -name route.ts | sort)
UNCONV=$(comm -23 <(echo "$ALL") <(echo "$CONV"))
```

| Bucket | Count |
|---|---:|
| **Total** API `route.ts` | **498** |
| Converted (use `tenantDb`) | 37 |
| **Unconverted** | **461** |
| ├─ Unconverted **with** direct `supabaseAdmin` (touch DB) | 396 |
| │  ├─ already call `getTenantForRequest` (ctx.tenantId in hand → **EASY**) | 145 |
| │  └─ derive tenant elsewhere (cron/webhook/portal/public/admin-token → **HARD**) | 251 |
| └─ Unconverted **without** `supabaseAdmin` (no tenant-table DB) | 65 |
| Unconverted routes referencing a clearly cross-tenant table¹ | ~110 |
| `cron/*` routes touching the DB (cross-tenant sweeps by design) | 32 |
| `webhooks/*` routes touching the DB (tenant resolved from event) | 7 |

¹ Grep heuristic for `from('tenants'|'inquiries'|'leads'|'platform_settings'|'tenant_members'|'tenant_domains'|'tenant_invites')`.
A hit does **not** mean "skip the route" — many hit both cross-tenant AND scoped
tables, so they become **partial** conversions, not exceptions.

Top unconverted domains: `admin` 113, `cron` 44, `finance` 36, `team-portal` 23,
`client` 16, `portal` 13, `dashboard` 12, `webhooks` 9, `settings` 9, `bookings` 9.

---

## 4. Safe conversion order

Ordered by **(a) mechanical ease and (b) blast radius** — do the routes where the
tenant is already resolved and the change is a near-mechanical swap first, since
those carry the most leak risk for the least conversion effort.

### Tier 1 — EASY, high-value (do first): the 145 `getTenantForRequest` + DB routes
These already have `const { tenantId } = await getTenantForRequest()`. Conversion is:
1. `import { tenantDb } from '@/lib/tenant-db'`
2. `const db = tenantDb(tenantId)`
3. Replace `supabaseAdmin.from('<scoped_table>')` → `db.from('<scoped_table>')`
4. **Leave** `supabaseAdmin.from('<cross_tenant_table>')` as-is (§5).
5. Drop now-redundant `.eq('tenant_id', tenantId)` (wrapper adds it) — harmless to
   leave, but cleaner to remove.
6. Add a `*.isolation.test.ts` (see §6) for any route touching sensitive data
   (finance, documents, invoices, clients, deals, bookings).

Suggested sub-order by sensitivity: `finance/*` → `invoices/*` → `documents/*` →
`clients/*` → `bookings/*` → `quotes/*` → the rest of Tier 1.

### Tier 2 — MEDIUM: `admin/*` tenant-scoped routes (82 without `getTenantForRequest`)
Admin routes authorize via `admin_token` / `verifyTenantAdminToken` / signed
`x-tenant-id`, not `getTenantForRequest`. Each must **first establish the acting
tenantId** (from the verified admin token / header), then feed it to `tenantDb`.
Do **not** convert an admin route until its tenant-resolution path is explicit and
verified — a wrong tenantId in equals a scoped-but-wrong query. Convert per-route,
with an isolation probe each.

### Tier 3 — HARD, careful: `portal/*` (13) + `team-portal/*` (23) + `client/*` (16)
Public/portal surfaces resolve tenant from a slug/header/session, not owner auth.
These are the highest-risk for a wrong-tenant resolve. Convert only after the
tenant is resolved and validated (the resolver lane owns this); pair every
conversion with a wrong-tenant probe test.

### Tier 4 — SPECIAL: `cron/*` (32) and `webhooks/*` (7)
These are **cross-tenant entrypoints by design** — a cron sweep iterates *all*
tenants; a Stripe webhook resolves the tenant from the event. They should **not**
blanket-convert. Instead:
- If a cron loops per-tenant, wrap the **per-iteration** body in `tenantDb(t.id)`.
- If it genuinely operates platform-wide (e.g. reads `tenants`), it stays on
  `supabaseAdmin` and is a NONE-write exception (§5).
- Webhooks: resolve tenant from the event, then use `tenantDb(resolvedTenantId)`
  for the scoped writes.

### Tier 5 — NO-OP: the 65 no-DB routes
Routes with no `supabaseAdmin` reference touch no tenant table directly (external
APIs, uploads, pure utilities, or delegate to a lib). **No conversion needed** —
verify per-route that any DB work they delegate to a `lib/*` helper is itself
scoped, then mark done.

---

## 5. NONE-write exceptions (MUST stay on `supabaseAdmin`)

`tenantDb` **cannot** be applied to these; forcing it would break the query
(filtering/stamping a `tenant_id` column that doesn't exist).

### 5a. Cross-tenant tables (no `tenant_id` by design)
`tenants`, `inquiries`, `leads`, `platform_settings`, `tenant_members`,
`tenant_domains`, `tenant_invites`, `impersonation_events` (audit is cross-tenant),
and any `*_settings`/platform-config table. Reads/writes here are intentionally
cross-tenant — **keep `supabaseAdmin`**.

### 5b. Join tables with no `tenant_id` column
`crew_members` (keyed by `crew_id` + `team_member_id`), `booking_assignees`, and
similar link tables. These **cannot** be tenant-scoped by `tenantDb`.
**Landmine already found:** `crews/route.ts::setMembers` deletes/inserts
`crew_members` scoped only by `crew_id`; a PATCH with another tenant's crew id
reaches the delete. `tenantDb` can't close this (no `tenant_id`); it needs an
explicit **crew-ownership guard** (verify the crew belongs to `tenantId` before
touching its members). Every join-table write needs the same "parent belongs to
tenant?" check added by hand — grep for these during conversion.

### 5c. Platform/admin operations that legitimately span tenants
Cron sweeps over all tenants, the super-admin tenant list, provisioning
(`create-tenant-from-lead`, `activate-tenant`, `provision-tenant`), and
onboarding. These read/write across tenants on purpose — **keep `supabaseAdmin`**,
and document the exception inline with a one-line `// cross-tenant by design:` note
so the next reader doesn't "fix" it into a bug.

**Rule of thumb:** if the table has a `tenant_id` column and the route acts on
behalf of *one* tenant → `tenantDb`. If the table has no `tenant_id`, or the route
acts platform-wide → `supabaseAdmin` + an inline exception comment.

---

## 6. Verification — the isolation test harness

`src/test/tenant-isolation-harness.ts` provides `createTenantDbHarness(seed)`: an
in-memory fake of the service_role client that **actually applies** the chained
filters against a multi-tenant seed. Because `tenantDb.select` injects
`.eq('tenant_id', ctx)`, a row seeded for another tenant is genuinely filtered out
— a real **wrong-tenant probe**, not a structural assertion that can rot.

Five reference `*.isolation.test.ts` files ship with this plan (jobs/[id], deals,
notifications, crews, schedules). Each asserts a positive control (own tenant sees
its data) and a wrong-tenant probe (tenant B's row is absent / a foreign id 404s /
a forged body `tenant_id` is overwritten by the ctx stamp).

**These probes were mutation-tested:** neutering the harness's `tenant_id` filter
makes all five fail, proving they are not vacuous.

**Convention for each converted route:** add a `route.isolation.test.ts` beside it
using the harness:

```ts
const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'
// mock getTenantForRequest → ctx tenant A; seed a tenant-B row; assert it never leaks.
```

---

## 7. Risks & caveats

- **Partial conversions are the norm, not the exception.** A route touching both
  scoped and cross-tenant tables is *correctly* half-converted. Don't chase 100%
  `tenantDb` usage — chase "every scoped access is scoped."
- **Join-table writes (§5b) are the real leak surface** and `tenantDb` does not fix
  them. Budget a manual ownership-guard pass; a converted route can still leak
  through an un-scoped `crew_members`-style write.
- **Redundant `.eq('tenant_id', …)` left in place is harmless** (same value twice)
  but should be cleaned to avoid implying the wrapper isn't doing it.
- **Tenant mis-resolution ≠ tenant mis-scoping.** `tenantDb` guarantees a query is
  scoped to *the tenantId you pass it*. If the route resolves the *wrong* tenantId
  (Tiers 2–4), the query is safely scoped to the wrong tenant. Resolution
  correctness (the resolver lane) is a separate, prerequisite guarantee.
- **This doc converts nothing.** It is the map. Conversion happens per-route,
  file-only, each with `tsc --noEmit` + its isolation test, in the order above.

---

## 8. Definition of done (per route)

1. Every tenant-scoped access uses `tenantDb(tenantId)`.
2. Cross-tenant accesses keep `supabaseAdmin` with an inline `// cross-tenant …` note.
3. Any join-table write has an explicit parent-ownership guard.
4. A `route.isolation.test.ts` with a positive control + wrong-tenant probe passes.
5. `npx tsc --noEmit` clean; the route's tests green.
