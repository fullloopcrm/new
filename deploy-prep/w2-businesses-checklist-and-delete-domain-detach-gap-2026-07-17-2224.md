# W2 gap/fluidity refresh — 2026-07-17 22:24

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-dashboard-websites-settings-shape-and-domain-fallback-gap-2026-07-17-2211.md`.

Leader's fresh 3-deep queue this round (22:15 LEADER->W2): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: admin/businesses/[id] onboarding checklist + tenant-delete Vercel cleanup both bypassed tenant_domains

Same discovery pattern as the last two rounds: widened past the resolver functions themselves (re-confirmed clean, no drift) into a caller neither prior round had touched — `/api/admin/businesses/[id]/route.ts`, the platform-admin tenant detail endpoint (GET onboarding checklist + PUT + DELETE). Only its PUT `domain` normalization had ever been audited (`route.domain-normalization.test.ts`, an earlier round); GET and DELETE were untouched ground.

Two independent bugs found, both variants of the same root cause — this route reads `tenants.domain_name` / `tenants.domain` directly and never consults `tenant_domains`, the P1 primary source that `admin/websites` (the recommended add-a-domain flow) writes to *exclusively*:

1. **GET checklist.website.custom_domain_live** — computed as `!!business.domain_name && !!business.dns_configured && !!business.website_published`. Two layers wrong: (a) it checks `domain_name`, which this same file's own PUT-handler comment documents as "the display/registrar-facing field... NOT what the resolver queries" — not even the correct legacy column; (b) it never checks `tenant_domains` at all. A tenant onboarded via `admin/websites` (tenant_domains-only, the now-common path) shows "Custom domain live: false" on its own admin onboarding checklist forever, regardless of actual live state. `checklist.accounts.domain_purchased` (a distinct, legitimately registrar-scoped field — "did an admin buy a domain name") was left unchanged; it's a real semantic difference, not the same bug.
2. **DELETE Vercel domain detach** — before hard-deleting a tenant, the handler reads `tenants.domain`/`domain_name` to know which Vercel domains to detach so they don't stay attached to the project serving nothing. `tenant_domains` rows are `ON DELETE CASCADE` (migrations/043_tenant_domains.sql) — gone from the DB the instant the tenants row deletes — and were never read out first. Any domain owned only through tenant_domains (again, the common case) stayed attached to Vercel indefinitely after its tenant was deleted, rather than being freed for reuse or cleanly torn down.

**Fixed:**
- GET now resolves `getPrimaryTenantDomain(id)` alongside the existing parallel queries and uses `!!(primaryDomain || business.domain) && !!business.dns_configured && !!business.website_published` for `custom_domain_live` — tenant_domains first, `tenants.domain` (the actual resolver-fallback field, not `domain_name`) second.
- DELETE now reads `tenant_domains` for the tenant (all rows, not just active — this route has no reactivate/soft-delete path yet, see carried-forward #1 below) *before* the tenants delete cascades them away, and folds every row's domain (+ `www.` variant) into the same best-effort `removeDomain()` sweep as the existing slug/legacy-domain detach, deduped.

**Why fresh ground, not a re-tread:** the 15:24 full resolver re-audit and this round's earlier passes verified the resolver functions and their known callers (dashboard/websites, referrers/[code], site-export, onboarding-verify, etc.). This route's GET/DELETE handlers were never in that caller list — same "bug lives in a caller's consumption, not the resolver" pattern as the last two rounds, just a caller nobody had reached yet.

Tests: 8 new (`route.tenant-domains-fresh-ground.test.ts`) — tenant_domains-only resolves `custom_domain_live` true, legacy `tenants.domain` fallback still works, neither source resolves → false, `domain_purchased` unaffected/unchanged, a **WRONG-TENANT PROBE** on GET (tenant B's live tenant_domains row never makes tenant A's `custom_domain_live` true), a DELETE probe that a tenant_domains-only domain gets detached, a DELETE probe that legacy + tenant_domains alias both detach with no duplicate calls, and a **WRONG-TENANT PROBE** on DELETE (deleting tenant A never calls `removeDomain` for tenant B's tenant_domains-only domain).

Verification: `tsc --noEmit` clean, `eslint` 0 warnings on both touched files, full suite 669/669 files, 2872/2909 tests (37 pre-existing skips, +1 file/+8 tests vs. last round), 0 regressions. File-only, no push/deploy/DB.

## (2) — continuation

Checked every sibling route under `/api/admin/businesses/[id]/*` for the same domain-column-vs-tenant_domains gap: `verify-checklist/route.ts` delegates its domain resolution into `runAllChecks()` (`onboarding-verify.ts`), already fixed in an earlier round (`getPrimaryTenantDomain(tenant.id) || tenant.domain`) — clean. `activate/route.ts` delegates entirely to `activate-tenant.ts`, already fixed (primary-domain reconcile on re-run) — clean. `/api/admin/businesses/route.ts` (tenant creation, POST) sets `domain`/`domain_name` together from the same input at creation time, before any tenant_domains row can exist — not a resolution bug, just first-write. No third instance found in this route family.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items unchanged from last round:
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call. (Directly relevant to this round's DELETE fix: because there's no deactivate path yet, every tenant_domains row for a tenant is still "live" by the time a tenant is deleted, which is exactly why the DELETE fix above reads all rows rather than filtering `active=true`.)
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3.
5. `finance/upload/route.ts`'s MIME gap — fixed elsewhere (`p1-w4`, commit `5af092d2`), pending merge into `p1-w2`. No change.

NEW this round: none deferred — both findings above were fixed in-round.

## MISSING-FEATURE GAPS / UX-FRICTION

Nothing new this round.
