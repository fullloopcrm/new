# ADR 0005 — RLS is belt-and-suspenders, not the live gate: the app-layer `.eq('tenant_id')` is what enforces isolation today; backfill NULL tenants before any policy is allowed to enforce

- **Status:** Proposed (recommendation: keep app-layer scoping as the enforcing gate; treat RLS as an inert, additively-staged DB backstop; **hard-block** enforcement until NULL-tenant rows are backfilled)
- **Date:** 2026-07-11
- **Decision driver:** The team says "tenant isolation" without agreeing on *what enforces it*. If someone believes RLS is protecting tenants, they will relax the app-layer discipline — and RLS is currently enforcing **nothing**. This ADR fixes the mental model in writing and names the one migration hazard (NULL tenants) that turns "enable RLS" into silent data loss.
- **Deciders:** Jeff (owner), platform leader
- **Author:** W3 (reconcile-gate lane), file-only

---

## Context (verified against code + the RLS plan doc)

**The app is `service_role` everywhere.** Every DB call uses the service-role client (`supabaseAdmin`); `src/lib/tenant-db.ts:2-6` states it outright: *"The platform runs every query through the service_role key, which BYPASSES Row-Level Security."* Verified surface: **433** of **498** API `route.ts` files reference `supabaseAdmin`; `0` use a scoped/RLS-bound client. The tenant-isolation plan puts the whole-repo count at ~541 files on the service-role client (`platform/docs/tenant-isolation-rls-plan.md:7-9`).

**Therefore the LIVE gate is the application layer.** Because `service_role` bypasses RLS, the *only* thing preventing tenant A from reading tenant B is each query carrying `.eq('tenant_id', …)` — enforced by:
- the convention itself (manual `.eq`, or the `tenantDb()` wrapper — ADR 0004),
- the CI gate `scripts/audit-tenant-scope.mjs`, which fails the build on any unscoped LIVE query against a tenant table,
- the self-attack proof `src/lib/cross-tenant-db.test.ts` (58 tests), which demonstrates a foreign-id read/update/delete is denied *by the filter*, against a fake store with no implicit scoping.

**RLS today enforces nothing.** Per the plan, verified against prod on 2026-07-04 (`tenant-isolation-rls-plan.md:5-17`): sampled tenant tables (`tenants, bookings, clients, payments, team_members, deals, notifications`) have `rowsecurity = true` but **0 policies**; `sms_conversations` has RLS **off**. Enabled-with-no-policies is default-deny for *non-service* clients — but the app is `service_role`, which ignores RLS entirely. So RLS is a switch wired to nothing while the app holds the only live key. There is also **no `SUPABASE_JWT_SECRET`** in prod (`:16`), so the scoped-client mechanism RLS would key on does not yet exist.

`tenant-db.ts:18-20` already frames the intended end state: *"This is the app-layer half of defense-in-depth. The DB-layer half (positive RLS policies + a non-superuser role) lands separately; until then this wrapper is the primary guard."* This ADR ratifies that framing and adds the migration guardrail.

## The decision this pins down

**Isolation is enforced at the application layer. RLS is defense-in-depth — a second wall that only starts bearing load once a scoped (non-service-role) client runs the query.** Neither replaces the other:

- **App-layer (`.eq`/`tenantDb`) = primary, live, load-bearing now.** It must not be relaxed on the theory that "RLS has our back." RLS does not, today.
- **RLS = additive backstop.** It catches the *forgotten filter* — the exact bug the app layer is one human mistake away from. Its value is realized only after (a) a scoped client exists and (b) call sites move onto it, per the staged plan (`tenant-isolation-rls-plan.md:47-81`). Deploying policies earlier is safe precisely *because* they're inert under `service_role` (`:39-45`) — that inertness is the staging mechanism, not a reason to skip them.

**Why belt-and-suspenders and not "just fix RLS and drop the app checks":** the platform has real, *intentional* cross-tenant paths — super-admin analytics, cron, platform ops (`audit-tenant-scope.mjs:67-70`; plan `:24`, `:86`). Those must keep a service-role escape hatch. As long as a bypassing role exists in the app, RLS can never be the *sole* gate — some code always runs above it. So the app-layer filter is not scaffolding to be removed; it is permanent, and RLS is added underneath it.

## The NULL-tenant caveat (the one hazard that makes "enable RLS" dangerous)

A tenant-isolation policy is `USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)` (plan `:31`, `:58`). SQL three-valued logic: for any row where `tenant_id IS NULL`, `NULL = <uuid>` evaluates to `NULL`, which is **not true**, so the row is **excluded** for a scoped client.

Consequence: **the moment a table's call sites move onto the scoped client (RLS enforcing), every existing row with `tenant_id IS NULL` silently disappears from that tenant's reads** — and `WITH CHECK` will reject writes that don't stamp a tenant. This is not a crash; it's rows vanishing from a live surface with no error. The same NULL rows stay visible under `service_role`, so it won't show up until the migrated path is exercised in prod.

**Hard rule, therefore:** before a tenant table's RLS policy is allowed to *enforce* (i.e., before its call sites are migrated to the scoped client), that table must have:
1. **no `tenant_id IS NULL` rows** — a query-driven audit + backfill, per table, not assumed;
2. **`tenant_id NOT NULL` + an index** thereafter, so the state can't regress (plan Stage 0, `:51-52`).

The app-layer `tenantDb` select already appends `.eq('tenant_id', …)`, so NULL-tenant rows are *already* invisible to wrapper-scoped reads today — meaning any NULL-tenant row is already an orphan. That's a reason to backfill regardless, and a reason the RLS cutover must not be the moment we *discover* orphans.

## Options considered

### Option A — Declare RLS the gate, relax app-layer checks
- **Cons:** RLS enforces nothing today (no policies, no scoped client, no JWT secret). Relaxing the app layer now removes the *only* live gate → immediate cross-tenant exposure. Even long-term, intentional service-role paths mean RLS can never be sole. Rejected outright.

### Option B — App-layer stays the gate; RLS staged in inert-first, enforced-last, gated on NULL backfill (the proposal)
- Keep `.eq`/`tenantDb` + the audit gate as the live enforcer.
- Land RLS additively per the plan: JWT secret → inert policies (service-role proves them harmless) → scoped-client helper → migrate call sites PII-first → lock.
- **Gate every table's enforcement transition on a NULL-tenant backfill.**
- **Pros:** No window without a live gate; RLS becomes a real backstop table-by-table; the silent-data-loss hazard is closed before it can fire; intentional cross-tenant paths keep their documented service-role exception.
- **Cons:** Two enforcement layers to reason about, and a per-table backfill precondition. Both are inherent to doing this safely, not incidental cost.

## Decision

**Recommend Option B.** Specifically:
1. **Written truth of record:** app-layer `.eq('tenant_id')` / `tenantDb` is the enforcing gate; RLS is defense-in-depth. No PR may relax app-layer scoping citing RLS until that table is provably enforcing under a scoped client.
2. **RLS lands inert-first, enforced-last**, following the staged plan — policies deployed while the app is still `service_role` have zero runtime effect and are validated as such before any client migration.
3. **NULL-tenant backfill is a hard precondition** for a table's enforcement cutover. A table with any `tenant_id IS NULL` row is **blocked** from scoped-client migration until backfilled and set `NOT NULL`.
4. **Service-role remains an intentional, documented allowlist** for cross-tenant admin/cron/platform ops — its existence is *why* the app layer stays permanent, not a defect to remove.

This ADR is a decision record, not an execution ticket: **no prod DDL, no policy, no backfill is run here.** The migrations/backfill are prepared as reviewed files and run by the leader after Jeff approves (per the plan's "PLAN ONLY / no prod DDL" stance, `tenant-isolation-rls-plan.md:2`).

## Consequences

**If we adopt app-primary + RLS-backstop (recommended):**
- The team shares one correct mental model: relaxing app-layer scoping is never safe on the basis of RLS until that specific table is enforcing.
- RLS accrues as a real second wall, table by table, catching the forgotten-filter bug the app layer is always one mistake from.
- The NULL-tenant silent-loss trap is disarmed before the cutover that would spring it.

**If we treat RLS as already protecting us (rejected):**
- A false sense of safety invites app-layer relaxation → a live cross-tenant leak, since RLS is currently wired to nothing.
- A naive "enable RLS + migrate" without the backfill gate → NULL-tenant rows silently vanish from live tenant surfaces, discovered only in prod.

**Cross-references:**
- Execution detail: `platform/docs/tenant-isolation-rls-plan.md` (stages, scoped-client design, open decisions for Jeff — JWT secret provisioning, migration scope, cross-tenant allowlist).
- App-layer adoption: ADR 0004 (tenantDb) — the app half this ADR calls the live gate.
- Fail-closed derivation precedent: ADR 0003 (voice) — same principle that an unresolved tenant must fail closed, not fall through to another tenant.
