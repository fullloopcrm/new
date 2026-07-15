# ADR 0004 — tenantDb adoption: new tenant-scoped writes go through the wrapper; structurally-exempt routes stay on supabaseAdmin, declared not defaulted

- **Status:** Proposed (recommendation: wrapper-by-default for new/edited tenant-write paths; keep the audit gate as the live enforcer; migrate legacy paths opportunistically, not big-bang)
- **Date:** 2026-07-11
- **Decision driver:** `tenantDb()` exists as the safe-by-default tenant-scoping layer but has **zero API-route adopters** today. Before we tell contributors "use tenantDb," we need a written rule for which routes must adopt it and which are legitimately exempt — otherwise the wrapper becomes cargo-culted onto cross-tenant routes (breaking them) or ignored on the ones that need it.
- **Deciders:** Jeff (owner), platform leader
- **Author:** W3 (reconcile-gate lane), file-only

---

## Verification note (read this before trusting the numbers)

The leader order for this ADR referenced `docs/tenantdb-none-write-routes.md` and "the 16 structurally-exempt NONE-write routes." **That file does not exist in this worktree (`p1-w3`) or in the main repo** — searched `find . -iname '*tenantdb*'` and the fullloopcrm root, no match. I have **not** reproduced or cited a "16" count, because I cannot verify it. This ADR instead defines the *classification policy* grounded in code that does exist and was read directly:

- the wrapper — `src/lib/tenant-db.ts`
- the live enforcer — `scripts/audit-tenant-scope.mjs`
- the self-attack proof — `src/lib/cross-tenant-db.test.ts`

If a concrete per-route exemption list is wanted, it should be generated from the audit script's own logic (below) and committed as that doc — a follow-up, flagged in Consequences.

## Context

The platform runs **every** query through the `service_role` client (`supabaseAdmin`), which **bypasses Postgres RLS**. So cross-tenant isolation depends entirely on each query remembering `.eq('tenant_id', …)`. Verified scale of the surface:

- **498** `route.ts` files under `src/app/api`.
- **433** of them reference `supabaseAdmin`.
- **0** of them import `tenantDb` (`grep -rl tenantDb src/app/api` → empty).

`tenantDb(tenantId)` (`src/lib/tenant-db.ts:31`) makes the safe path the default for tenant-owned tables:

- `select` → auto-appends `.eq('tenant_id', tenantId)` (`tenant-db.ts:40`)
- `insert` / `upsert` → auto-stamps `tenant_id` on every row, overriding any caller value (`tenant-db.ts:44`, `:53`)
- `update` / `delete` → auto-filtered by `tenant_id` (`tenant-db.ts:47`, `:50`)

Its own header is explicit about scope: *"Use this for TENANT-SCOPED tables only. Platform tables that have no tenant_id (e.g. `tenants`, `inquiries`, `leads`, `platform_settings`) must still use supabaseAdmin directly — those are cross-tenant by design."* (`tenant-db.ts:14-16`)

**What actually enforces isolation today is not the wrapper — it's the audit gate.** `scripts/audit-tenant-scope.mjs` scans every `.from('<tenant table>')` in `src` and fails CI on any LIVE query that is neither tenant-scoped nor a row-specific id lookup. The self-attack suite (`cross-tenant-db.test.ts`, 58 tests) proves both the manual `.eq` pattern *and* the `tenantDb` wrapper deny a foreign-id read/update/delete, against a fake store that deliberately has no implicit scoping. So adoption of the wrapper is a **defense-in-depth upgrade**, not the thing standing between us and a leak right now.

## The classification, derived from the audit script (not invented)

`audit-tenant-scope.mjs` already encodes exactly which queries need scoping and which are structurally exempt. The adoption policy should mirror it 1:1 so there is one source of truth, not two:

**MUST adopt tenantDb (or an equivalent explicit `.eq('tenant_id')`):**
- Any write (`insert`/`update`/`delete`/`upsert`) or read on a table in the script's `TENANT_TABLES` set (~129 tables carrying `tenant_id`, `audit-tenant-scope.mjs:32-62`) where the tenant comes from request context (`getTenantForRequest` / `getTenantFromHeaders`). This is the wrapper's whole reason to exist.

**Structurally exempt — stay on `supabaseAdmin`, and say why:**
1. **Non-tenant tables.** Tables *not* in `TENANT_TABLES` (`tenants`, `inquiries`, `leads`, `platform_settings`, …). They have no `tenant_id`; `tenantDb` would append a filter on a column that doesn't exist and break the query. The audit gate never flags these.
2. **Row-specific id / token lookups.** A lookup keyed by a globally-unique `id` / `*_id` / `*token*` is inherently row-scoped — a UUID or secret token can't belong to two tenants. The gate exempts these explicitly (`audit-tenant-scope.mjs:88`). Wrapping them adds nothing.
3. **Intentional cross-tenant paths.** Super-admin aggregates and platform ops that must read across tenants (`src/app/admin/analytics/*` is `EXCLUDE`d, `:67-70`; ad-hoc cases carry `// tenant-scope-ok: <reason>`, `:82`). These are cross-tenant *by design* — the wrapper is the wrong tool.
4. **Webhooks that derive their own tenant.** Paths that resolve tenant per-request from an external key rather than a session (e.g. the voice webhook keying on the dialed DID, ADR 0003) manage tenant explicitly and don't fit the `tenantDb(ctxTenantId)` shape. They still owe an explicit scope + a fail-closed guard.

"NONE-write route" = a route that performs **no** write to any tenant table (pure read, or writes only to non-tenant tables). Those need no `insert`/`update` stamping; if they also do no tenant-table *read*, they touch category (1)/(3) only and are exempt. The exact list of such routes is what the missing doc was meant to hold — see follow-up.

## Options considered

### Option A — Mandate tenantDb everywhere, retrofit all 433 routes now
- **Pros:** One uniform pattern; the wrapper's auto-stamp closes the "forgot `.eq`" class permanently on migrated routes.
- **Cons:** A 433-route big-bang with no behavioral test per route is exactly how you dark a live tenant. Categories (1)–(3) above would *break* under a blind retrofit (filtering non-tenant tables, double-scoping id lookups, killing admin aggregates). The audit gate already prevents new leaks, so the urgency this scale implies isn't real. Rejected.

### Option B — Wrapper-by-default for new/edited tenant-write paths; exempt categories declared; legacy migrates opportunistically (the proposal)
- **Every new or edited route that writes/reads a `TENANT_TABLES` table with a context tenant uses `tenantDb`.** Reviewers enforce this; the audit gate catches misses.
- **The four exempt categories stay on `supabaseAdmin`** and are marked at the call site — a one-line `// tenant-scope-ok: <category+reason>` — so exemption is a *declared decision*, auditable, not an omission indistinguishable from a bug.
- **Legacy tenant-write routes migrate opportunistically** (when a route is touched for other reasons), each behind the self-attack pattern, never as a bulk sweep.
- **Pros:** New code is safe-by-default; the risky retrofit is avoided; exemptions become greppable and reviewable; the audit gate remains the hard backstop regardless of adoption pace.
- **Cons:** Two patterns coexist for a long time (manual `.eq` in legacy, `tenantDb` in new). Acceptable — both are proven equivalent by the self-attack suite, and the gate treats them identically.

## Decision

**Recommend Option B.** Concretely:

1. **New rule for contributors:** any route that reads or writes a `TENANT_TABLES` table using a request-context tenant id **must** use `tenantDb(tenantId)`. Manual `.eq('tenant_id', …)` is grandfathered in existing code but not the pattern for new code.
2. **Exemptions are declared, not defaulted:** the four categories above stay on `supabaseAdmin` *with a `// tenant-scope-ok:` marker naming the category*. An unmarked raw `supabaseAdmin` query on a tenant table is treated as a bug by review + the gate.
3. **The audit gate stays the enforcer.** `npm run audit:tenant` remains the CI gate; adoption of the wrapper does not change what the gate checks. This ADR does not propose weakening or bypassing it.
4. **No bulk migration.** Legacy routes move to `tenantDb` only when independently edited, each covered by the cross-tenant self-attack pattern before merge.

## Consequences

**If we adopt wrapper-by-default (recommended):**
- New tenant-write code cannot leak by "forgetting `.eq`" — the wrapper stamps and filters unconditionally.
- Exemptions become a greppable inventory (`// tenant-scope-ok:`), which is the honest version of the "structurally-exempt routes" doc — self-maintaining, at the call site, instead of a separate list that drifts.
- The manual and wrapper patterns coexist; the self-attack suite and audit gate keep both honest.

**If we mandate a blind retrofit (rejected):**
- High chance of darking a live tenant surface via double-scoping / non-tenant-table breakage, for a class of bug the audit gate already blocks.

**Follow-ups this ADR depends on (not resolved here):**
- **Author the missing `docs/tenantdb-none-write-routes.md`** — or better, *generate* it from `audit-tenant-scope.mjs` so it can't drift: a small `--list-exempt` mode that emits every route touching only non-tenant tables / id-lookups. The "16" figure from the leader order is **unverified** and should be regenerated, not transcribed. (Belongs to whoever owns route inventory; my lane is reconcile-gate + CI, file-only.)
- Confirm with the leader whether the exemption marker should be the existing `// tenant-scope-ok:` (reused) or a distinct `// tenantdb-exempt:` token, to keep "intentional cross-tenant read" separate from "structurally can't use the wrapper."
- Relationship to ADR 0005 (RLS defense-in-depth): once a scoped RLS client lands, `tenantDb`'s app-layer filter and the DB policy are the two halves of the same guarantee. Adoption order should follow 0005's PII-first table sequence.
