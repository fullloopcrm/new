# ADR 0002 — Config source-of-truth: make `tenant_domains` authoritative and drop `tenants.domain`

- **Status:** Proposed (recommendation: defer the drop; do the resolver flip in stages)
- **Date:** 2026-07-11
- **Decision driver:** We store a tenant's domain in two places with a precedence rule between them. This is the direct cause of the brand-swap incident. Do we consolidate onto one source of truth, and if so which one?
- **Deciders:** Jeff (owner), platform leader
- **Author:** W3 (reconcile-gate lane), file-only

---

## Context

A tenant's web domain lives in **two** places today:

1. **`tenants.domain`** — a single `text` column on the tenant row. One domain per tenant.
2. **`tenant_domains`** — a separate table (migration `platform/src/lib/migrations/043_tenant_domains.sql`) holding the full set of a tenant's domains, including aliases: `(tenant_id, domain unique, active, is_primary, notes)`.

The domain resolver `getTenantByDomain` (`platform/src/lib/tenant-lookup.ts:88`) reads **both, in a fixed precedence**:

1. First query `tenants.domain` for an exact match (`tenant-lookup.ts:98`).
2. **Only if that misses**, fall back to `tenant_domains` filtered on `active = true` (`tenant-lookup.ts:117`).

So `tenants.domain` **wins** whenever it is set. This precedence is deliberate and test-locked: `platform/src/lib/tenant-lookup.test.ts:65` — *"resolves via tenants.domain and does NOT fall through to tenant_domains"* — asserts `tenant_domains` is never queried when `tenants.domain` already matched.

That test file's own header (`tenant-lookup.test.ts:5`) names this code as *"the code behind the tenant brand-swap incident."* The failure mode of a two-source system with a precedence rule is exactly a brand swap: if the two sources disagree for a host, which tenant a customer's browser resolves to depends on which column happens to be populated — not on any single intended answer.

**The two sources already disagree by design.** Migration `043` seeds nycmaid's aliases into `tenant_domains` and marks `thenewyorkcitymaid.com` as `is_primary = true` (`043_tenant_domains.sql:31`), while the table comment (`043:21`) explicitly says *"The canonical domain still lives on `tenants.domain` for back-compat."* So there are two different notions of "primary" — `tenants.domain` and `tenant_domains.is_primary` — with no constraint forcing them to agree.

**Blast radius of the column.** `tenants.domain` is not just read by the resolver. A repo-wide scan for a `.domain` field on a tenant object returns **64 non-test files** (`grep -rln "\.domain\b" src/lib src/app | grep -v test`). That count is a **superset** — it includes email domains, `resend_domain`, SEO competitor domains, etc., not only `tenants.domain` — so treat 64 as an upper bound, not the exact consumer count. Confirmed direct consumers of `tenants.domain` include at least: `tenant-lookup.ts`, `tenant-site.ts:81`, `onboarding-gate.ts:56`, `activate-tenant.ts` (multiple), `site-readiness.ts:160`, `selena-legacy-email.ts:48`, `team-provisioning.ts:106`, `onboarding-verify.ts:194`, and the `TenantInfo` type itself (`tenant-lookup.ts:16`, carried through both `getTenantBySlug` and `getTenantByDomain`). Any drop of the column must account for every one of these — the exact set needs enumeration before execution (see Follow-ups), not assumption.

## The problem with the status quo

- **Two writable sources, one precedence rule** → the two can disagree, and the disagreement is silent until a customer lands on the wrong brand. This has already happened once (the brand-swap incident).
- **`is_primary` is unenforced.** `tenant_domains` has `domain` UNIQUE but **no constraint that exactly one row per tenant has `is_primary = true`** (verified: no partial unique index in `043`). So "the tenant's primary domain" is not currently a well-defined value in `tenant_domains` alone — a tenant could have zero or many primaries.
- **Onboarding writes are split.** New-domain flows have to decide which source to write, and keep them consistent by hand.

## Options considered

### Option A — Keep both sources, keep the precedence (status quo)

- **Pros:** Zero migration. Aliases already work via the fallback.
- **Cons:** The exact configuration that caused the brand-swap incident stays live. Two sources of truth with a silent-disagreement failure mode. `is_primary` stays unenforced and unused by the resolver.

### Option B — Make `tenant_domains` authoritative; drop `tenants.domain` (the proposal)

Flip the model so `tenant_domains` is the single source of truth for *every* tenant domain, with `is_primary` designating the canonical one, and delete `tenants.domain`.

- **Pros:** One source of truth. Aliases and primary live in one place with one shape. Removes the precedence rule and therefore the brand-swap failure mode. Onboarding writes one table.
- **Cons:** **This is a resolver flip on the highest-blast-radius lookup in the app** (every inbound request resolves a tenant through it). It requires: (1) a data backfill so every tenant with a `tenants.domain` has a corresponding `tenant_domains` row (`is_primary = true`) — **no tenant may be left resolvable only via the column we're about to drop**; (2) a new invariant enforcing exactly one `is_primary` per tenant; (3) updating every `tenants.domain` reader (the consumer set above) to read the primary from `tenant_domains`; (4) rewriting the resolver and its test precedence. Missing any tenant in the backfill **darks that tenant's site**.

### Option C — Consolidate the other direction (keep `tenants.domain`, drop `tenant_domains`)

- **Pros:** Fewest code changes; `tenants.domain` is the more widely-read source.
- **Cons:** **Loses multi-domain support entirely.** nycmaid alone has two live domains (`043:5`); collapsing to a single column re-breaks alias resolution. Rejected — it removes a real capability.

## Decision

**Recommend Option B in direction, but staged — do NOT drop `tenants.domain` in one step.** The consolidation target is correct (one source of truth, brand-swap failure mode removed), but a big-bang drop of the column behind the busiest lookup in the app is the kind of change that darks live tenants. Sequence it so every step is reversible and no step depends on data that hasn't been proven present.

**Preconditions before any code flip:**

1. **Backfill proven complete.** Every tenant with a non-null `tenants.domain` has a matching `tenant_domains` row with `active = true, is_primary = true`. Proof: a reconcile query returns **zero** tenants that are resolvable only via `tenants.domain`. (This is a DB read + a prepared backfill script; DB writes are the leader's to run after Jeff approves — this lane prepares the script as a file, per standing rules.)
2. **`is_primary` invariant added.** A partial unique index — `create unique index on tenant_domains (tenant_id) where is_primary` — so "the primary domain" is a single well-defined value. Prepared as a migration file; not run here.
3. **Readers migrated.** Every confirmed `tenants.domain` consumer reads the primary from `tenant_domains` (via a single helper, e.g. `getPrimaryDomain(tenantId)`), so the column has no remaining readers.

**Only then, in this order:**

4. **Flip the resolver.** `getTenantByDomain` queries `tenant_domains` first (or exclusively), and `tenant-lookup.test.ts` precedence is rewritten to match. Ship this **while `tenants.domain` still exists** — the column becomes dead but present, so a bad flip is a one-line revert, not a data-loss event.
5. **Drop the column** only after the flip has run in production with no brand-swap regressions for a defined bake period. This is the one irreversible step, and it comes last.

## Consequences

**If we stage the flip (recommended):**
- The brand-swap failure mode is removed at step 4 (single source for resolution), and the risky part (dropping the column) is deferred until after the safe part is proven in prod.
- Every step 1–4 is reversible. Only step 5 is one-way, and it runs against a column that already has no readers or resolver dependence.
- We add a real integrity constraint (`is_primary` uniqueness) the current schema lacks.

**If we drop the column in one step (rejected):**
- Any tenant missed by the backfill is resolvable only via the dropped column → **its site darks** the moment the migration runs. On the busiest lookup in the app, blast radius is every tenant, and the failure is a live outage, not a degraded response.
- Rollback means restoring a column and its data mid-incident.

**If we keep the status quo (also rejected):**
- The exact two-source-with-precedence configuration that caused the brand-swap incident stays in production. The next populated-vs-empty mismatch is another silent brand swap.

**Follow-ups this ADR depends on (tracked elsewhere, not resolved here):**
- Enumerate the exact set of `tenants.domain` readers (the 64-file grep is an upper bound — narrow it to true `tenants.domain` consumers).
- Prepare (as files) the backfill script and the `is_primary` partial-unique migration; leader runs them after Jeff approves.
- Reconcile query proving zero tenants resolve only via `tenants.domain` (belongs in the reconcile gate this lane owns).
- Define the production bake period between resolver flip (step 4) and column drop (step 5).
