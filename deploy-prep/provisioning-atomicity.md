# Provisioning atomicity — end-to-end write trace

**Author:** W1 (schema + backfill lane) · **Date:** 2026-07-12
**Scope:** trace `provisionTenant` end-to-end, enumerate every DB write on the
tenant-creation path, mark each transactional-vs-not, and document the
partial-tenant failure / rollback story.

> **Read this first — the write list needs correcting.** The lane brief listed
> the writes as: *tenant row, selena_config, tenant_domains, pricing_rows,
> emoji_usage, time_estimates.* Traced against the code, that list conflates two
> different things:
>
> - `pricing_rows`, `emoji_usage`, `time_estimates` are **not** separate writes.
>   They are sub-keys inside the **single** `tenants.selena_config` JSONB column
>   written once by `provisionTenant`. See `provision-tenant.ts:36-49`.
> - `tenant_domains` is **not** written by `provisionTenant` at all. It is
>   written only by `activateTenant` (step 8, `activate-tenant.ts:354-375`).
>
> So `provisionTenant` itself touches exactly **two tables**: `service_types`
> (1 insert) and `tenants` (up to 4 column updates). Everything else on the
> "provisioning" story belongs to the surrounding `activateTenant` orchestrator.

---

## 1. The hard fact about atomicity

**There is no cross-write transaction anywhere on this path.**

Every write goes through the Supabase JS client (`supabaseAdmin`), which talks to
PostgREST over HTTP. Each `.insert()` / `.update()` / `.upsert()` is its **own
HTTP round-trip and its own auto-committed statement**. The JS client cannot open
a `BEGIN … COMMIT` spanning multiple calls. Consequences:

- The only atomicity that exists is **statement-level**: one `.insert(rows)` of N
  rows either inserts all N or none (single SQL statement). That is the whole of it.
- Across the ~5 writes in `provisionTenant`, and the ~15+ writes in
  `activateTenant`, **each commits independently**. A failure at write K leaves
  writes 1..K-1 already committed in the database with no rollback.
- Making provisioning truly atomic would require moving the whole sequence into a
  single Postgres function (RPC / `SECURITY DEFINER`) and calling it once. That
  does not exist today; **idempotent re-run is the substitute for rollback** (§4).

---

## 2. `provisionTenant` — its own writes (`provision-tenant.ts`)

Entry: `provisionTenant({ tenantId, industry?, overrides? })`. It first does a
**read** (`SELECT` from `tenants`, line 95-99) and throws if the tenant is absent.
Then, in order:

| # | Line | Table | Op | Guard (only writes when…) | Transactional? | Error checked? |
|---|------|-------|----|---------------------------|----------------|----------------|
| R | 95 | tenants | SELECT | always | n/a | partial — `!tenant ⇒ throw`, but a transient error also yields `!tenant` and throws a misleading "not found" |
| R | 104 | service_types | SELECT count | always | n/a | no |
| 1 | 123 | **service_types** | INSERT (multi-row) | zero active services exist | statement-atomic (all rows or none) | **no** — destructures `{ data: inserted }`, ignores `error` |
| 2 | 134 | **tenants.selena_config** | UPDATE | `selena_config` empty/absent | single-statement | **no** — no `error` inspection |
| 3 | 143 | **tenants.business_hours** | UPDATE | `business_hours` null | single-statement | **no** |
| 4 | 153 | **tenants.payment_methods** | UPDATE | `payment_methods` null/empty | single-statement | **no** |
| 5 | 164 | **tenants.guidelines_en** | UPDATE | `guidelines_en` null | single-statement | **no** |

Notes:

- **Writes 2–5 are four separate `UPDATE tenants` round-trips**, not one. They
  could be a single update; today they are four independent commits against the
  same row.
- **`selena_config` (write 2) is where `pricing_rows`, `time_estimates`,
  `emoji_usage`, `checklist_fields`, `cancellation_policy`, etc. live** — all as
  keys of one JSONB object built by `DEFAULT_SELENA_CONFIG` and written in a
  single UPDATE. They are not, and never were, distinct writes.
- **Silent-failure risk (real, HIGH):** none of writes 1–5 inspect the returned
  `error`. If PostgREST rejects a write (RLS, constraint, transient), the call
  resolves, the code proceeds, and `ProvisionResult` still reports
  `seeded.<x> = true`. **The result object over-reports success.** A caller that
  trusts `result.seeded` cannot distinguish "written" from "silently rejected."
  Contrast with `activateTenant`, which *does* check `error` per step.
- `selena_config` (write 2) only runs when the column is empty, so it never
  clobbers an existing config — but it is a **full replace**, not a merge.

### Callers of `provisionTenant`

| Caller | File | Wrapped in try/catch? | On failure |
|--------|------|-----------------------|------------|
| Admin provision endpoint | `api/admin/businesses/[id]/provision/route.ts:18` | yes → 500 | returns error to admin UI |
| Full activation | `activate-tenant.ts:104` | yes → step `failed` | continues activation |
| Stripe webhook (checkout) | `api/webhooks/stripe/route.ts:157` | **no** | an unchecked throw here would abort the webhook handler mid-sequence (after the tenant row + entity insert already committed) → partial tenant |
| Create-tenant-from-lead | `create-tenant-from-lead.ts:184` | yes (best-effort) | logs, leaves tenant un-seeded but not orphaned |

---

## 3. `activateTenant` — the full provisioning orchestra (`activate-tenant.ts`)

This is the "one door every tenant funnels through." It calls `provisionTenant`
(step 2) and then performs many more independent writes. All writes here are
also non-transactional PostgREST calls. Ordered writes:

| Phase | Line | Table | Op | Error handling | Notes |
|-------|------|-------|----|----------------|-------|
| crumb | 61 | notifications | INSERT | swallowed (best-effort) | breadcrumb; never blocks |
| 2 settings | 104 | (delegates to `provisionTenant`) | — | try/catch → step failed | see §2 |
| 2b geo | 134 | tenants (lat/lng) | UPDATE | in try/catch | only when center newly geocoded |
| 3 tasks | 164 | onboarding_tasks | INSERT (seed) | try/catch | idempotent seed |
| 3b finance/HR | 185-187 | entities, ledger accounts, hr_* | INSERT (seed) | try/catch | 3 seed helpers, each own commits |
| 4 team | 212 | team_members | INSERT | `error` checked | only when zero active members |
| review dest | 250 | tenants.selena_config | UPDATE (merge) | in try/catch | **read-modify-write** `{...selena, google_review_link}` — lost-update risk under concurrency |
| 5 owner | 279 | tenant_members | INSERT | `error` checked | issues one-time PIN |
| 7 domains | 320,332 | (Vercel API, not DB) | external | returns status | slow; deliberately last |
| **8 domain routing** | **364** | **tenant_domains** | **UPSERT** | `error` checked | `onConflict:'domain', ignoreDuplicates:true` — see risk below |
| 8b seo | 385 | seo properties (via `registerSeoProperty`) | INSERT | try/catch | best-effort |
| final | 419 | tenants.status | UPDATE → 'active' | `error` checked | **only** when `gate.passed && ownerOk && siteServes` |

**`tenant_domains` write detail (`activate-tenant.ts:354-375`):** builds 1–2 rows
(carrying host `<slug>.fullloopcrm.com`, plus normalized custom apex if set) and
upserts with `onConflict: 'domain', ignoreDuplicates: true`.

- **Risk (MEDIUM):** `ignoreDuplicates` means if `domain` already exists **owned
  by a different tenant**, the row is silently skipped — it is *not* re-pointed to
  this tenant. A stale/mis-owned domain row stays mis-routed with no error. The
  step reports `done`. This is a routing-correctness gap the W2 resolver inherits.
- Because the upsert conflict target is `domain` (unique), re-running activation
  is safe/idempotent for the same tenant's own domains.

---

## 4. Partial-tenant failure & "rollback" story

**There is no rollback.** If any write fails mid-sequence, every prior write is
already committed. The system does not undo them. Recovery is by **idempotent
re-run**, not by transaction rollback. Concretely:

### What a mid-sequence failure leaves behind

- **Inside `provisionTenant`:** because writes 1–5 don't check `error`, a failed
  write does **not** stop the sequence — later writes still attempt and the result
  falsely reports success. You get a tenant seeded on some columns, silently
  missing others, and a `ProvisionResult` that claims all is well. The only hard
  stop is the initial tenant `SELECT` throwing.
- **Inside `activateTenant`:** each phase is wrapped in try/catch and records a
  `failed` step, then **continues**. The tenant is left partially provisioned but
  `status` stays **not `active`** (the final flip at line 418 requires
  `gate.passed && ownerOk && siteServes`). So a partial failure = a tenant that
  exists, is partly seeded, and is *not* marked live. That is the intended safe
  resting state.
- **Stripe webhook path is the sharp edge:** the `provisionTenant` call at
  `stripe/route.ts:157` is **not** individually try/caught. The tenant row +
  `entities` insert already committed above it (lines 151-155). A throw from
  provisioning would bubble, and depending on webhook handling could leave a paid
  tenant with a row + entity but no seeded settings, and the prospect link
  (line 161) unset. Re-delivery of the webhook is the only recovery.

### The recovery model (rollback substitute)

`activateTenant` is **idempotent by construction** — every step no-ops when its
work already exists (zero-count guards, `onConflict` upserts, "exists?" checks).
So the sanctioned recovery for a half-provisioned tenant is: **hit Activate again.**
Completed steps skip; only the missing ones run; `status` flips to `active` once
the spine passes. This is why there is no compensating-transaction / cleanup code:
re-entrancy replaces rollback.

**One genuine compensating action exists** — and it's the exception that proves
the rule: `create-tenant-from-lead.ts:165-172` deletes the reserved
`territory_claims` row if the tenant `INSERT` fails ("both or neither"). That is
the only place the codebase does explicit rollback, and it's for the territory
reservation, not for the provisioning writes.

---

## 5. Findings summary (for the leader)

| Sev | Finding | Location |
|-----|---------|----------|
| HIGH | `provisionTenant` ignores the `error` return on all 5 writes → silent partial failure, `ProvisionResult.seeded` over-reports success | `provision-tenant.ts:123,134,143,153,164` |
| MED | Stripe webhook calls `provisionTenant` without its own try/catch; tenant + entity already committed above → partial paid tenant on throw | `stripe/route.ts:157` |
| MED | `tenant_domains` upsert `ignoreDuplicates` silently skips a domain already owned by another tenant → possible stale mis-routing, reported as `done` | `activate-tenant.ts:364-366` |
| LOW | `review_dest` selena_config update is read-modify-write (lost-update under concurrent activation) | `activate-tenant.ts:246-253` |
| INFO | No cross-write transaction exists anywhere; atomicity is statement-level only. True atomicity would need a Postgres RPC. Recovery = idempotent re-run. | whole path |

**None of the above is fixed here** — this is a trace/documentation deliverable.
Each row is a candidate the leader can schedule. My lane owns the `tenant_domains`
schema, so the MED `tenant_domains` upsert-ownership gap is the one most in-lane
if a follow-up is wanted.
