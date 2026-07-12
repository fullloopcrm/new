# RLS Cutover — Master Plan (the single ordered path to end-to-end enforcement)

_Author: worker W5, branch `p1-w5`, 2026-07-12. **Consolidation only — no DDL/DML run, no
env set, no deploy, no route wired by W5.** This is the front door: it sequences the prior
deploy-prep RLS artifacts into ONE ordered cutover and says which gate blocks which step. It
references those artifacts; it does not duplicate them. The leader runs each gated prod step
after Jeff approves._

## What "RLS enforces end-to-end" actually means

Today tenant isolation is **100% application-level**: every server query runs through
`supabaseAdmin` (the `service_role` key), which **bypasses RLS by design**. A
`tenant_isolation` policy on a table has **zero runtime effect** for any query on that client.
So enabling RLS changes nothing observable until a table's call sites move onto a **scoped**
client that presents a JWT with `role=authenticated` + a `tenant_id` claim.

**End state (the goal):** for every Tier-1…5 tenant table, (1) RLS is enabled with a
`tenant_isolation` policy, (2) all single-tenant readers/writers run on `tenantClient()`, and
(3) the remaining `service_role` (KEEP) call sites still carry an explicit
`.eq('tenant_id', …)`. At that point the database itself refuses a cross-tenant read even if
an app-level scope is forgotten — RLS is **load-bearing**, not inert.

## The four macro-stages (and the artifact that owns each)

```
A. ADOPT tenant-client   → the scoped-client factory exists + is trusted     [DONE, unwired]
B. WIRE JWT secret       → tokens tenantClient mints are accepted by Postgres  [gated: env+deploy]
C. ENABLE RLS per tier   → policies exist (inert while readers on service_role)[gated: prod DDL]
D. CUTOVER per table     → convert readers → flip load-bearing → verify isolation [gated]
```

| Stage | Owns the detail | Gated prod action |
|---|---|---|
| A | `tenant-client-path-spec.md`, `platform/src/lib/tenant-client.ts` (+ test), `proof-of-conversion-read-routes.md` | none (file-only, committed) |
| B | `supabase-jwt-secret-wiring-plan.md` | set env in 3 scopes + startup check + deploy |
| C | `rls-enablement-dry-run-checklist.md`, `rls-tier-rollout-order.md`, `rls-enablement-rollout-plan.md`, `rls-gap-closure.sql` (+ `-verify.sql`) | run enable DDL, tier by tier |
| D | `service-role-to-scoped-client-map.md`, `rls-verify-queries.sql`, this doc §D | wire converted routes + deploy |

**Hard precondition to ALL of C/D:** `rls-coverage-audit.md` live-reconcile PASS +
`null-tenant-backfill.sql` proven (`null-tenant-backfill-verify.sql` Query B = `PASS`) +
`schema-drift-register.md` resolved for the tier. These are Sections 0–2 of
`rls-enablement-dry-run-checklist.md`. A NULL `tenant_id` row silently vanishes the instant a
scoped read hits an RLS-on table — prove zero NULLs before any table goes load-bearing.

---

## Stage A — Adopt the tenant-client path  ✅ (built, unwired, reversible)

The scoped-client factory is the missing key that makes RLS non-vacuous.

- **Factory:** `platform/src/lib/tenant-client.ts` — `tenantClient(tenantId)` mints a
  short-lived HS256 JWT (`role:authenticated`, `tenant_id`, `aud:authenticated`), attaches it
  as the request `Authorization`, and **fails closed** (throws) if `SUPABASE_JWT_SECRET`, the
  Supabase URL, or `tenantId` is absent. It NEVER falls back to `service_role`/anon. Unit
  tests pin the claims, that the signature is a real HMAC, fail-closed behavior,
  **cross-tenant rejection** (the `tenant_id` is signature-bound — a tampered claim breaks the
  sig), **null/absent-tenant** rejection, and **claim-injection** resistance (a crafted
  `tenant_id` cannot smuggle `role:service_role`). `vitest src/lib/tenant-client.test.ts` = 17
  pass.
- **Known divergences (deliberate):** signs with Node `crypto`, not `jose` → **Node-runtime
  only** (a converted route must not run on the edge runtime until swapped to `jose`) and
  synchronous (call sites use `const db = tenantClient(id)`, no `await`). Rationale in the
  module header + `tenant-client-path-spec.md`.
- **Conversion is a two-line change** per route — proven with passing isolation tests, live
  routes UNCHANGED, in `platform/src/lib/tenant-client-proof/` (batch 1: quote-templates,
  crews, clients/stats; batch 2: bookings/stats, finance/pending, leads/domains) and
  documented in `proof-of-conversion-read-routes.md`.

**Gate A:** factory committed, tests green. ✅ Do NOT convert any live route until Gate B.

## Stage B — Wire `SUPABASE_JWT_SECRET`  (gated: env + deploy)

Until the secret is set, `tenantClient()` throws fail-closed on first use, so **no route can
be converted**. Full runbook: `supabase-jwt-secret-wiring-plan.md`. Sequence:

1. Retrieve the project's existing **Supabase JWT Secret** (Dashboard → Project Settings → API
   → JWT Secret) — the SAME secret already signing `anon`/`service_role`, so tokens are
   accepted with **zero** Supabase/DB change. It is **not** a new secret and **not**
   `NEXT_PUBLIC_*` (server-only; exposing it lets a browser forge `service_role`).
2. Add it to `platform/.env.local` (git-ignored) and to Vercel env in **Production + Preview +
   Development**, marked Sensitive.
3. Add a startup presence check (fail the build/boot, not the first query) — a follow-up code
   change hooked off the existing `prebuild` gate.
4. **Smoke test** before converting real routes: a token minted for a known tenant reads a
   non-RLS table `200`; on an RLS-enabled table, the owning tenant returns rows and a
   cross-tenant read returns `[]`. If the matched read is empty, reconcile `aud`/`iss` against
   a real GoTrue-issued token (flagged unverified in the spec).

**Gate B:** secret present in all envs, startup check passes, smoke test shows accept +
owner-rows / cross-tenant-empty. Only then proceed to convert routes in Stage D.

> B and C are independent — C (enable) is inert and can run before or after B is wired.
> D (cutover) requires BOTH B done and the table's C done.

## Stage C — Enable RLS per tier  (gated: prod DDL, inert)

Enable RLS + `tenant_isolation` on the 58 no-RLS tenant tables, highest-risk first. **Inert
while readers are still on `service_role`** — that is why it is safe to stage ahead of the app.

- **Pre-flight (blocking):** run `rls-enablement-dry-run-checklist.md` Sections 0–4 —
  live-state reconcile, drift resolved, NULLs = `PASS`, and a **transaction + ROLLBACK dry
  run** proving `rls-gap-closure.sql`'s precondition guard passes with zero statement errors
  and leaves prod unchanged.
- **Order:** `rls-tier-rollout-order.md` — the numbered 58-table checklist, Tier 1 (`clients`,
  `bookings`, `invoices`, `bank_accounts`, `bank_transactions`, `documents`,
  `sms_conversations`, `sms_conversation_messages`) first. Recommended cadence: tier-by-tier,
  splitting `rls-gap-closure.sql` at its `-- TIER N` banners.
- **Verify each tier (`rls-gap-closure-verify.sql`):** Gate 2a coverage (every table
  `rls_enabled=t`, `policy_count≥1`, policy `cmd=ALL` / role `{authenticated}` / predicate on
  `tenant_id`) **and** Gate 2b inertness (as `service_role`, `SELECT count(*)` still returns
  ALL rows — if any count drops or errors while the app is still on `service_role`, STOP).

**Gate C (per tier):** coverage green + service_role still reads everything. Rollback is
behavior-neutral (`DROP POLICY … ; ALTER TABLE … DISABLE ROW LEVEL SECURITY`).

## Stage D — Cutover per table  (gated: this is where RLS starts enforcing)

For each table, in the same highest-risk-first order, **after** its Stage C is green and Stage
B is done. The conversion surface and CONVERT-vs-KEEP dispositions are enumerated in
`service-role-to-scoped-client-map.md` (623 `service_role` call sites; the ≈298 tenant-scoped
API remainder is the bulk of CONVERT work).

Per table:

1. **Convert** every single-tenant reader/writer (`getTenantForRequest()`-resolved) from
   `supabaseAdmin` to `tenantClient(tenantId)` — the two-line change. **Keep** every
   `.eq('tenant_id', …)` as a defense-in-depth backstop through the rollout window. Node
   runtime only — verify each route's runtime.
2. **Audit KEEP readers** of the same table (cron sweeps, platform admin, webhooks): they
   legitimately stay on `service_role`, so they get **no RLS backstop** — every one MUST retain
   an explicit `.eq('tenant_id', …)`. A KEEP site that drops its scope is an IDOR the same day
   RLS makes everyone else safe. Re-run the IDOR sweep (2026-06-29 came back clean) against
   every KEEP site before declaring the table done.
3. **Verify isolation (live, `rls-verify-queries.sql`):** through `tenantClient`, an
   owning-tenant read returns its rows, a cross-tenant read returns `[]`, and counts match the
   pre-cutover `service_role` baseline. This is the proof RLS is now load-bearing for the
   table.

**Gate D (per table):** all CONVERT sites moved, all KEEP sites still explicitly scoped,
cross-tenant read provably empty, counts reconcile. Only then is the table "done".

### Cross-table read dependencies (must resolve before converting the parent route)

Some reads join or count a **child** table scoped by a foreign key, not by `tenant_id`.
Converting the parent route runs the child query on the scoped client too — which under RLS
**default-denies** unless the child table also has a policy.

- **Known case:** `GET /api/leads/domains` counts `website_visits` by `domain_id`.
  `website_visits` is NOT in the 58-table Tier list. Converting this route requires either
  giving `website_visits` its own tenant policy (or one joining through `domains.tenant_id`)
  first, or keeping its child counts on a KEEP path with an explicit tenant check. Flagged in
  `converted-read-routes-batch2.example.ts`.
- **General rule:** before converting any multi-table read, confirm every table it touches is
  either already load-bearing (its own Stage C+D done) or a deliberately-scoped KEEP path. Do
  not convert a parent whose child has no policy.

---

## The one-line spine

**Build tenant-client (A ✅) → wire JWT secret + smoke test (B) → backfill NULLs PASS + dry-run
ROLLBACK clean → enable RLS Tier 1→5, inert (C) → per table: convert CONVERT sites, keep+scope
KEEP sites, prove cross-tenant read empty (D) → RLS is load-bearing end to end.** Any gate FAIL
stops the line.

## Honest scope & limitations

- **Consolidation only.** No secret set, no env changed, no deploy, no DDL/DML run, no live
  route wired by W5. Every prod action here is gated to Jeff/the leader.
- **Migration-derived, not a live read.** The table set, tiering, and call-site counts come
  from migrations + a static grep of `platform/src` — which is exactly why Stages B/C/D each
  end in a live verify against prod (`rls-*-verify.sql`, the smoke test, the isolation check).
- **`aud`/`iss` unverified** against a live GoTrue response (Stage B step 4) — reconcile before
  trusting converted routes.
- **KEEP sites are the residual attack surface** after cutover; they do not get safer and must
  be hand-audited per table.

## Artifact index (everything this plan sequences)

| Stage | Artifact |
|---|---|
| A | `tenant-client-path-spec.md` · `platform/src/lib/tenant-client.ts` (+`.test.ts`) · `proof-of-conversion-read-routes.md` · `platform/src/lib/tenant-client-proof/` |
| B | `supabase-jwt-secret-wiring-plan.md` · `credential-rotation-policy.md` (rotation note) |
| C | `rls-coverage-audit.md` · `rls-enablement-rollout-plan.md` · `rls-tier-rollout-order.md` · `rls-enablement-dry-run-checklist.md` · `rls-gap-closure.sql` · `rls-gap-closure-verify.sql` · `null-tenant-backfill*.sql`/`.md` · `schema-drift-register.md` |
| D | `service-role-to-scoped-client-map.md` · `rls-verify-queries.sql` · `security-definer-rpc-review.md` (SECDEF residual) |
| Cross-cut | `part0-execution-master-checklist.md` (all lanes) · `compliance-data-map.md` · `audit-log-coverage-matrix.md` · `tenant-data-retention-map.md` |
